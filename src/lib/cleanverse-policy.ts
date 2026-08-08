/**
 * Machine Trust policy engine.
 *
 * Pure, isomorphic evaluation of a transfer / issuance request against
 * Cleanverse credentials (CVI for participants, CVA for the asset).
 * The engine is the single source of truth for the demo — the UI never
 * decides pass/fail on its own.
 */

import type { CvaCredential, CviCredential } from "@/data/cleanverse-registry";

export type RuleSource = "CVI" | "CVA" | "POLICY" | "MONAD";
export type RuleStatus = "pass" | "fail" | "skipped";

export type RuleResult = {
  code: string;
  label: string;
  requirement: string;
  observed: string;
  status: RuleStatus;
  reason: string;
  source: RuleSource;
};

export type PolicyKind = "issuance" | "transfer";

export type Evaluation = {
  decisionId: string;
  policyId: string;
  kind: PolicyKind;
  mode: "demo" | "live";
  approved: boolean;
  blockedBy: string | null;
  rules: RuleResult[];
  settlement: { chain: "Monad"; txRef: string } | null;
  evaluatedAt: string;
  notice?: string;
};

export type PolicyInput = {
  kind: PolicyKind;
  sender: CviCredential;
  recipient: CviCredential | null;
  asset: CvaCredential;
};

const OK = "Requirement satisfied.";

function hash(input: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function ref(prefix: string, seed: string) {
  return `${prefix}0x${hash(seed)}…${hash(seed + "b").slice(0, 4)}`;
}

function cviRules(c: CviCredential | null, who: "sender" | "recipient"): RuleResult[] {
  const tag = who === "sender" ? "Holder" : "Counterparty";
  const prefix = who === "sender" ? "CVI-01" : "CVI-10";

  if (!c || c.status === "absent") {
    return [
      {
        code: `${prefix}.presence`,
        label: `${tag} identity credential`,
        requirement: "A valid CVI credential must be presented",
        observed: "no credential presented",
        status: "fail",
        reason: `${tag} wallet has no Cleanverse Verified Identity. Machine Trust cannot resolve a legal entity behind this address.`,
        source: "CVI",
      },
    ];
  }

  const presence: RuleResult = {
    code: `${prefix}.presence`,
    label: `${tag} identity credential`,
    requirement: "A valid CVI credential must be presented",
    observed: c.id,
    status: "pass",
    reason: OK,
    source: "CVI",
  };

  const statusOk = c.status === "active";
  const state: RuleResult = {
    code: `${prefix}.status`,
    label: `${tag} credential status`,
    requirement: "Credential status must be active",
    observed: c.status,
    status: statusOk ? "pass" : "fail",
    reason: statusOk
      ? OK
      : c.status === "revoked"
        ? `Cleanverse revoked this credential. Revocation propagates to every Machine Trust policy immediately.`
        : `Credential expired on ${c.expiresAt}. Re-verification through Cleanverse is required.`,
    source: "CVI",
  };

  return [presence, state];
}

function cvaRules(a: CvaCredential, kind: PolicyKind): RuleResult[] {
  const active = a.status === "active";
  const rules: RuleResult[] = [
    {
      code: "CVA-01.status",
      label: "Asset credential status",
      requirement: "CVA credential must be active for the passport",
      observed: `${a.id} · ${a.status}`,
      status: active ? "pass" : "fail",
      reason: active
        ? OK
        : "Asset credential suspended by Cleanverse — the machine cannot be issued or transferred while suspended.",
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
        : `${att.label} lapsed on ${att.validUntil}. The asset credential no longer supports a compliant ${kind}.`,
      source: "CVA",
    });
  }

  if (kind === "transfer") {
    rules.push({
      code: "CVA-03.transferable",
      label: "Transfer restriction flag",
      requirement: "Asset must be flagged transferable",
      observed: String(a.transferable),
      status: a.transferable ? "pass" : "fail",
      reason: a.transferable ? OK : "Asset is locked for transfer at the credential level.",
      source: "CVA",
    });
  }

  return rules;
}

function matchRules(recipient: CviCredential, asset: CvaCredential): RuleResult[] {
  const r = asset.restrictions;
  const jurisdictionOk = r.allowedJurisdictions.includes(recipient.jurisdiction);
  const tierOk = recipient.kycTier >= r.minKycTier;
  const accreditationOk = r.allowedAccreditation.includes(recipient.accreditation);

  return [
    {
      code: "MT-TRF.jurisdiction",
      label: "Jurisdiction restriction",
      requirement: `Holder jurisdiction ∈ [${r.allowedJurisdictions.join(", ")}]`,
      observed: recipient.jurisdiction,
      status: jurisdictionOk ? "pass" : "fail",
      reason: jurisdictionOk
        ? OK
        : `${recipient.jurisdiction} is outside the jurisdictions encoded in the asset credential.`,
      source: "POLICY",
    },
    {
      code: "MT-TRF.kyc",
      label: "Verification tier",
      requirement: `CVI tier ≥ ${r.minKycTier}`,
      observed: `tier ${recipient.kycTier}`,
      status: tierOk ? "pass" : "fail",
      reason: tierOk ? OK : "Counterparty verification tier is below the asset policy threshold.",
      source: "POLICY",
    },
    {
      code: "MT-TRF.accreditation",
      label: "Holder eligibility",
      requirement: `Accreditation ∈ [${r.allowedAccreditation.join(", ")}]`,
      observed: recipient.accreditation,
      status: accreditationOk ? "pass" : "fail",
      reason: accreditationOk
        ? OK
        : "Counterparty is not an eligible holder class for this asset.",
      source: "POLICY",
    },
  ];
}

/** Deterministic, side-effect-free policy evaluation. */
export function evaluatePolicy(input: PolicyInput, now = new Date()): Evaluation {
  const { kind, sender, recipient, asset } = input;

  const rules: RuleResult[] = [
    ...cviRules(sender, "sender"),
    ...cvaRules(asset, kind),
    ...(kind === "transfer"
      ? [
          ...cviRules(recipient, "recipient"),
          ...(recipient && recipient.status !== "absent" ? matchRules(recipient, asset) : []),
        ]
      : []),
  ];

  const blocked = rules.find((r) => r.status === "fail") ?? null;
  const approved = !blocked;
  const seed = `${kind}:${sender.id}:${recipient?.id ?? "none"}:${asset.id}:${rules
    .map((r) => r.status)
    .join("")}`;

  const settlementRule: RuleResult = {
    code: "MONAD.execute",
    label: kind === "transfer" ? "Ownership transfer on Monad" : "Asset issuance on Monad",
    requirement: "Execute only when every Cleanverse check passes",
    observed: approved ? "submitted" : "not submitted",
    status: approved ? "pass" : "skipped",
    reason: approved
      ? "Compliance proven off-chain, state change executed on Monad."
      : `Execution never reached the chain — blocked at ${blocked?.code}.`,
    source: "MONAD",
  };

  return {
    decisionId: `cv:decision/${hash(seed)}`,
    policyId: kind === "transfer" ? "MT-POLICY-TRANSFER-v1" : "MT-POLICY-ISSUANCE-v1",
    kind,
    mode: "demo",
    approved,
    blockedBy: blocked?.code ?? null,
    rules: [...rules, settlementRule],
    settlement: approved ? { chain: "Monad", txRef: ref("monad:tx/", seed) } : null,
    evaluatedAt: now.toISOString(),
  };
}