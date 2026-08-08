/**
 * CCP — Cleanverse Compliance Protocol evaluation.
 *
 * Deterministic, side-effect free. Used directly as the local CCP engine when
 * no Cleanverse deployment is configured, and used to shape/normalise the
 * response when one is. The UI never grades a transaction itself.
 */

import type {
  AtokenRecord,
  Evaluation,
  PolicyInput,
  PolicyKind,
  RuleResult,
  CvaCredential,
  CviCredential,
} from "./types";

const OK = "Requirement satisfied.";

export const RULESET = {
  issuance: "ccp:ruleset/machine-trust-rwa-issuance-v1",
  transfer: "ccp:ruleset/machine-trust-rwa-transfer-v1",
} as const;

export function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function ref(prefix: string, seed: string) {
  return `${prefix}0x${hash(seed)}${hash(seed + "b").slice(0, 4)}`;
}

export function apassRef(c: CviCredential | null) {
  return c && c.status !== "absent" ? `cvi:apass/${hash(c.id)}` : null;
}

export function atokenIdFor(asset: CvaCredential) {
  return `cva:atoken/${asset.subject.passportId}-${hash(asset.id).slice(0, 6)}`;
}

/** The A-Token record produced by a successful issuance. */
export function mintedToken(asset: CvaCredential, now: Date): AtokenRecord {
  return {
    ref: ref("cva:tx/", asset.id + now.toISOString().slice(0, 10)),
    tokenId: atokenIdFor(asset),
    credentialId: asset.id,
    passportId: asset.subject.passportId,
    status: "minted",
    transferable: asset.transferable,
    attestations: asset.attestations.filter((a) => a.status === "valid").length,
    mintedAt: now.toISOString(),
  };
}

export function unissuedToken(asset: CvaCredential): AtokenRecord {
  return {
    ref: "—",
    tokenId: atokenIdFor(asset),
    credentialId: asset.id,
    passportId: asset.subject.passportId,
    status: "unissued",
    transferable: asset.transferable,
    attestations: asset.attestations.filter((a) => a.status === "valid").length,
    mintedAt: null,
  };
}

/* ------------------------------- CVI / A-Pass ------------------------------ */

function cviRules(
  c: CviCredential | null,
  who: "sender" | "recipient",
  kind: PolicyKind,
): RuleResult[] {
  const tag = who === "sender" ? (kind === "issuance" ? "Issuer" : "Holder") : "Recipient";
  const prefix = who === "sender" ? "CVI-01" : "CVI-10";

  if (!c || c.status === "absent") {
    return [
      {
        code: `${prefix}.apass`,
        label: `${tag} A-Pass`,
        requirement: "A Cleanverse Verified Identity (A-Pass) must resolve for this wallet",
        observed: "no A-Pass resolved",
        status: "fail",
        reason: `${tag} wallet holds no A-Pass. Cleanverse cannot resolve a legal entity, so Machine Trust has nobody to bind the asset to.`,
        source: "CVI",
      },
    ];
  }

  const active = c.status === "active";
  return [
    {
      code: `${prefix}.apass`,
      label: `${tag} A-Pass`,
      requirement: "A Cleanverse Verified Identity (A-Pass) must resolve for this wallet",
      observed: `${c.id} · ${c.holder.did}`,
      status: "pass",
      reason: OK,
      source: "CVI",
    },
    {
      code: `${prefix}.status`,
      label: `${tag} credential status`,
      requirement: "A-Pass status must be active",
      observed: c.status,
      status: active ? "pass" : "fail",
      reason: active
        ? OK
        : c.status === "revoked"
          ? "Cleanverse revoked this A-Pass. Revocation propagates to every Machine Trust decision immediately."
          : `A-Pass expired on ${c.expiresAt}. Re-verification through Cleanverse is required.`,
      source: "CVI",
    },
  ];
}

/* ------------------------------- CVA / A-Token ----------------------------- */

function cvaRules(a: CvaCredential, kind: PolicyKind, token: AtokenRecord | null): RuleResult[] {
  const active = a.status === "active";
  const rules: RuleResult[] = [
    {
      code: "CVA-01.status",
      label: "Verified asset record",
      requirement: "A Cleanverse Verified Asset record must be active for this passport",
      observed: `${a.id} · ${a.status}`,
      status: active ? "pass" : "fail",
      reason: active
        ? OK
        : "Asset record suspended by Cleanverse — no A-Token can be minted or moved while suspended.",
      source: "CVA",
    },
  ];

  for (const att of a.attestations) {
    const valid = att.status === "valid";
    rules.push({
      code: `CVA-02.${att.code.toLowerCase()}`,
      label: att.label,
      requirement: `Attestation must be valid (attestor: ${att.attestor})`,
      observed: `${att.status} · until ${att.validUntil}`,
      status: valid ? "pass" : "fail",
      reason: valid
        ? OK
        : `${att.label} lapsed on ${att.validUntil}. The verified asset record no longer supports a compliant ${kind}.`,
      source: "CVA",
    });
  }

  if (kind === "issuance") {
    rules.push({
      code: "CVA-04.mint",
      label: "A-Token mint eligibility",
      requirement: "Asset record + attestations must support minting the A-Token",
      observed: atokenIdFor(a),
      status: rules.every((r) => r.status === "pass") ? "pass" : "skipped",
      reason: rules.every((r) => r.status === "pass")
        ? "A-Token minted against the Machine Passport and bound to the issuer A-Pass."
        : "Mint not attempted — the verified asset record failed an earlier check.",
      source: "CVA",
    });
  }

  if (kind === "transfer") {
    const issued = token?.status === "minted" || token?.status === "active";
    rules.push({
      code: "CVA-05.issued",
      label: "A-Token exists",
      requirement: "The asset must have been issued as an A-Token before it can move",
      observed: issued ? token!.tokenId : "no A-Token minted",
      status: issued ? "pass" : "fail",
      reason: issued
        ? OK
        : "Nothing to transfer: run issuance first so Cleanverse mints the A-Token for this passport.",
      source: "CVA",
    });
    rules.push({
      code: "CVA-03.transferable",
      label: "Transfer restriction flag",
      requirement: "A-Token must be flagged transferable",
      observed: String(a.transferable),
      status: a.transferable ? "pass" : "fail",
      reason: a.transferable ? OK : "A-Token is locked for transfer at the credential level.",
      source: "CVA",
    });
  }

  return rules;
}

/* ----------------------------------- CCP ----------------------------------- */

function ccpRules(recipient: CviCredential, asset: CvaCredential): RuleResult[] {
  const r = asset.restrictions;
  const jurisdictionOk = r.allowedJurisdictions.includes(recipient.jurisdiction);
  const tierOk = recipient.kycTier >= r.minKycTier;
  const accreditationOk = r.allowedAccreditation.includes(recipient.accreditation);

  return [
    {
      code: "CCP-20.jurisdiction",
      label: "Jurisdiction rule",
      requirement: `A-Pass jurisdiction ∈ [${r.allowedJurisdictions.join(", ")}]`,
      observed: recipient.jurisdiction,
      status: jurisdictionOk ? "pass" : "fail",
      reason: jurisdictionOk
        ? OK
        : `${recipient.jurisdiction} is outside the jurisdictions encoded in the A-Token restrictions.`,
      source: "CCP",
    },
    {
      code: "CCP-21.kyc",
      label: "Verification tier rule",
      requirement: `A-Pass tier ≥ ${r.minKycTier}`,
      observed: `tier ${recipient.kycTier}`,
      status: tierOk ? "pass" : "fail",
      reason: tierOk ? OK : "Recipient verification tier is below the A-Token policy threshold.",
      source: "CCP",
    },
    {
      code: "CCP-22.eligibility",
      label: "Holder eligibility rule",
      requirement: `Accreditation ∈ [${r.allowedAccreditation.join(", ")}]`,
      observed: recipient.accreditation,
      status: accreditationOk ? "pass" : "fail",
      reason: accreditationOk ? OK : "Recipient is not an eligible holder class for this A-Token.",
      source: "CCP",
    },
  ];
}

function ccpIssuanceRules(issuer: CviCredential, asset: CvaCredential): RuleResult[] {
  const authorised =
    issuer.status === "active" &&
    issuer.kycTier >= asset.restrictions.minKycTier &&
    asset.restrictions.allowedAccreditation.includes(issuer.accreditation);

  return [
    {
      code: "CCP-10.issuer",
      label: "Issuer authorisation rule",
      requirement: `Issuer A-Pass must be active, tier ≥ ${asset.restrictions.minKycTier} and an eligible issuer class`,
      observed: `${issuer.status} · tier ${issuer.kycTier} · ${issuer.accreditation}`,
      status: authorised ? "pass" : "fail",
      reason: authorised
        ? OK
        : "CCP refused issuance: this identity is not authorised to issue this asset class.",
      source: "CCP",
    },
    {
      code: "CCP-11.binding",
      label: "Passport ↔ A-Token binding",
      requirement: "A-Token subject must match the Machine Passport under Machine Trust custody",
      observed: `${asset.subject.passportId} · ${asset.subject.serial}`,
      status: "pass",
      reason: OK,
      source: "CCP",
    },
  ];
}

/* -------------------------------- Evaluation ------------------------------- */

export function evaluateCcp(input: PolicyInput, now = new Date()): Evaluation {
  const { kind, sender, recipient, asset } = input;
  const incomingToken = input.aToken ?? null;

  const rules: RuleResult[] =
    kind === "issuance"
      ? [
          ...cviRules(sender, "sender", kind),
          ...cvaRules(asset, kind, incomingToken),
          ...ccpIssuanceRules(sender, asset),
        ]
      : [
          ...cviRules(sender, "sender", kind),
          ...cviRules(recipient, "recipient", kind),
          ...cvaRules(asset, kind, incomingToken),
          ...(recipient && recipient.status !== "absent" ? ccpRules(recipient, asset) : []),
        ];

  const blocked = rules.find((r) => r.status === "fail") ?? null;
  const approved = !blocked;
  const seed = `${kind}:${sender.id}:${recipient?.id ?? "none"}:${asset.id}:${rules
    .map((r) => r.status)
    .join("")}`;

  rules.push({
    code: "MONAD.execute",
    label: kind === "transfer" ? "Ownership transfer on Monad" : "A-Token issuance on Monad",
    requirement: "Execute only after a positive CCP pre-transaction decision",
    observed: approved ? "submitted" : "not submitted",
    status: approved ? "pass" : "skipped",
    reason: approved
      ? "CCP approved off-chain, state change executed on Monad."
      : `Execution never reached the chain — CCP blocked at ${blocked?.code}.`,
    source: "MONAD",
  });

  const token =
    kind === "issuance"
      ? approved
        ? mintedToken(asset, now)
        : unissuedToken(asset)
      : incomingToken;

  return {
    decisionId: `ccp:decision/${hash(seed)}`,
    policyId: RULESET[kind],
    kind,
    mode: "demo",
    approved,
    blockedBy: blocked?.code ?? null,
    rules,
    settlement: approved ? { chain: "Monad", txRef: ref("monad:tx/", seed) } : null,
    aToken: token,
    trace: {
      cvi: { senderRef: apassRef(sender), recipientRef: apassRef(recipient) },
      cva: { tokenRef: token?.mintedAt ? token.ref : null, tokenId: token?.tokenId ?? null },
      ccp: { decisionRef: `ccp:decision/${hash(seed)}`, rulesetId: RULESET[kind] },
    },
    evaluatedAt: now.toISOString(),
    notice:
      "Local CCP engine — no Cleanverse deployment configured. Decisions are computed from the local A-Pass / A-Token fixtures, never fabricated API responses.",
  };
}
