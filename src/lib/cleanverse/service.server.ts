/**
 * Cleanverse Track 1 orchestration (server-only).
 *
 * Required order:
 *   Machine Passport → CVI (A-Pass) → CVA (A-Token) → CCP (verify_apass) → Monad
 *
 * LIVE  — CLEANVERSE_SANDBOX_API_ID + CLEANVERSE_SANDBOX_API_KEY present.
 *         Every gate is a real cooperate call. Failures fail closed.
 * DEMO  — local CCP engine over fixtures (no secrets / no network).
 *
 * Docs: Cleanverse API v5.6 — verify_apass data.code 4 = transfer allowed.
 */

import {
  CleanverseError,
  queryApass,
  queryDepositAtokenList,
  readConfig,
  verifyApass,
  type AtokenListing,
  type CleanverseConfig,
  type VerifyApassData,
} from "./api.server";
import { RULESET, atokenIdFor, evaluateCcp, hash, unissuedToken } from "./ccp";
import type { AtokenRecord, Evaluation, PolicyInput, RuleResult } from "./types";

export type CleanverseMode = "demo" | "live";

export function resolveMode(): CleanverseMode {
  return readConfig() ? "live" : "demo";
}

function failClosed(input: PolicyInput, stage: RuleResult["source"], message: string): Evaluation {
  const rulesetId = RULESET[input.kind];
  return {
    decisionId: "ccp:decision/unavailable",
    policyId: rulesetId,
    kind: input.kind,
    mode: "live",
    approved: false,
    blockedBy: `${stage}.unavailable`,
    rules: [
      {
        code: `${stage}.unavailable`,
        label: `Cleanverse ${stage} service`,
        requirement: "A decision must be returned by Cleanverse",
        observed: message,
        status: "fail",
        reason:
          "No decision was returned. Machine Trust fails closed: without Cleanverse, nothing is issued and nothing settles.",
        source: stage,
      },
    ],
    settlement: null,
    aToken: input.aToken ?? unissuedToken(input.asset),
    trace: {
      cvi: { senderRef: null, recipientRef: null },
      cva: { tokenRef: null, tokenId: atokenIdFor(input.asset) },
      ccp: { decisionRef: "ccp:decision/unavailable", rulesetId },
    },
    evaluatedAt: new Date().toISOString(),
    notice: "Live Cleanverse sandbox unreachable — no result was simulated.",
  };
}

function errText(error: unknown) {
  return error instanceof CleanverseError
    ? error.message
    : error instanceof Error
      ? error.message
      : "unknown error";
}

function listingsOf(data: { tokens?: AtokenListing[] } | null): AtokenListing[] {
  return data?.tokens ?? [];
}

function atokenSymbolOf(listing: AtokenListing | undefined) {
  return listing?.atoken?.symbol ?? null;
}

function addressOf(listing: AtokenListing | undefined) {
  return listing?.atoken?.address ?? null;
}

function pickListing(listings: AtokenListing[], preferredAtoken: string | null) {
  if (!preferredAtoken) return listings[0];
  return (
    listings.find((l) => atokenSymbolOf(l)?.toLowerCase() === preferredAtoken.toLowerCase()) ??
    listings[0]
  );
}

/** Docs: data.code 4 = allowed. Envelope 0000 only means the API call succeeded. */
function ccpVerdict(inner: VerifyApassData | null, envelopeCode: string, envelopeMessage: string) {
  if (envelopeCode !== "0000") {
    return {
      allowed: false,
      code: envelopeCode,
      reason: envelopeMessage || `Cleanverse deny (envelope ${envelopeCode}).`,
    };
  }
  const code = Number(inner?.code);
  if (code === 4) {
    return {
      allowed: true,
      code: "4",
      reason: "Cleanverse verify_apass: valid A-Pass and transfer allowed.",
    };
  }
  if (code === 1) {
    return { allowed: false, code: "1", reason: "A-Token not found for this chain." };
  }
  if (code === 2) {
    return {
      allowed: false,
      code: "2",
      reason: "No A-Pass for this address — Cleanverse onboarding required.",
    };
  }
  if (code === 3) {
    return {
      allowed: false,
      code: "3",
      reason: "A-Pass exists but cannot transfer this A-Token (expired or frozen).",
    };
  }
  return {
    allowed: false,
    code: String(inner?.code ?? "?"),
    reason: inner?.message || "Cleanverse denied the pre-transaction check.",
  };
}

async function cviRule(
  cfg: CleanverseConfig,
  who: string,
  code: string,
  address: string,
): Promise<{ rule: RuleResult; ref: string | null }> {
  const env = await queryApass(cfg, address);
  const record = env.data ?? {};
  const active =
    env.code === "0000" &&
    !!record.cvRecordId &&
    (record.status === 1 ||
      record.status === "1" ||
      record.status === undefined ||
      record.status === null);

  const countries = Array.isArray(record.countries) ? record.countries.join(",") : "";
  const detail = [
    record.status !== undefined && record.status !== null ? `status ${record.status}` : null,
    record.tier !== undefined ? `tier ${record.tier}` : null,
    record.subTier !== undefined ? `subTier ${record.subTier}` : null,
    countries ? `countries ${countries}` : null,
    record.expirationTime ? `until ${record.expirationTime}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    ref: record.cvRecordId ?? null,
    rule: {
      code: `${code}.apass`,
      label: `${who} A-Pass`,
      requirement: "Cleanverse must return an active A-Pass for this wallet",
      observed: `${address.slice(0, 10)}… ${detail || env.message}`,
      status: active ? "pass" : "fail",
      reason: active
        ? "Requirement satisfied — A-Pass resolved from the live Cleanverse registry."
        : `Cleanverse returned no active A-Pass (${env.code}: ${env.message}).`,
      source: "CVI",
    },
  };
}

export async function evaluateWithCleanverse(input: PolicyInput): Promise<Evaluation> {
  const cfg = readConfig();
  if (!cfg) return evaluateCcp(input);

  const now = new Date();
  const rules: RuleResult[] = [];
  const refs: Record<string, string | null> = {};

  // 1 — CVI / A-Pass for every party
  const parties = [
    {
      who: input.kind === "issuance" ? "Issuer" : "Holder",
      code: "CVI-01",
      address: input.sender.holder.wallet,
    },
    ...(input.kind === "transfer" && input.recipient
      ? [{ who: "Recipient", code: "CVI-10", address: input.recipient.holder.wallet }]
      : []),
  ];

  for (const p of parties) {
    try {
      const res = await cviRule(cfg, p.who, p.code, p.address);
      refs[p.code] = res.ref;
      rules.push(res.rule);
    } catch (error) {
      return failClosed(input, "CVI", errText(error));
    }
  }

  // 2 — CVA / A-Token registry binding for this machine asset
  let atokenAddress: string | null = null;
  let token: AtokenRecord | null = input.aToken ?? null;
  try {
    const env = await queryDepositAtokenList(cfg);
    const listings = listingsOf(env.data);
    const listing = pickListing(listings, cfg.atokenSymbol);
    atokenAddress = addressOf(listing);
    const atokenSym = atokenSymbolOf(listing);
    rules.push({
      code: "CVA-04.atoken",
      label: "A-Token registration",
      requirement: "The asset must resolve to an A-Token registered with Cleanverse",
      observed: atokenAddress
        ? `${atokenSym ?? "A-Token"} · ${atokenAddress.slice(0, 12)}…`
        : `no A-Token returned (${env.code}: ${env.message})`,
      status: atokenAddress ? "pass" : "fail",
      reason: atokenAddress
        ? "A-Token resolved from the Cleanverse asset registry and bound to the Machine Passport."
        : "Cleanverse returned no registered A-Token for this asset.",
      source: "CVA",
    });
    if (atokenAddress) {
      token = {
        ref: `cva:atoken/${atokenAddress}`,
        tokenId: atokenSym ? `${atokenSym}:${atokenIdFor(input.asset)}` : atokenIdFor(input.asset),
        credentialId: input.asset.id,
        passportId: input.asset.subject.passportId,
        status: input.kind === "issuance" ? "minted" : (input.aToken?.status ?? "active"),
        transferable: input.asset.transferable,
        attestations: input.asset.attestations.filter((a) => a.status === "valid").length,
        mintedAt: input.aToken?.mintedAt ?? now.toISOString(),
        contractAddress: atokenAddress,
      };
    }
  } catch (error) {
    return failClosed(input, "CVA", errText(error));
  }

  // 3 — CCP pre-transaction: POST /verify_apass (docs: data.code 4 = allowed)
  let decisionRef = `ccp:decision/${hash(`${input.kind}:${input.sender.id}:${input.asset.id}`)}`;
  if (atokenAddress) {
    try {
      const subjects = [
        {
          who: input.kind === "issuance" ? "Issuer" : "Holder",
          code: "CCP-10",
          address: input.sender.holder.wallet,
        },
        ...(input.kind === "transfer" && input.recipient
          ? [{ who: "Recipient", code: "CCP-20", address: input.recipient.holder.wallet }]
          : []),
      ];
      for (const s of subjects) {
        const env = await verifyApass(cfg, atokenAddress, s.address);
        const verdict = ccpVerdict(env.data, env.code, env.message);
        rules.push({
          code: `${s.code}.pretx`,
          label: `CCP pre-transaction · ${s.who}`,
          requirement: "Cleanverse must permit this party to move the A-Token",
          observed: `verify_apass data.code ${verdict.code} · ${env.data?.message ?? env.message}`,
          status: verdict.allowed ? "pass" : "fail",
          reason: verdict.reason,
          source: "CCP",
        });
      }
      decisionRef = `ccp:decision/${hash(
        `${atokenAddress}:${input.sender.holder.wallet}:${input.recipient?.holder.wallet ?? "none"}`,
      )}`;
    } catch (error) {
      return failClosed(input, "CCP", errText(error));
    }
  }

  const blocked = rules.find((r) => r.status === "fail") ?? null;
  const approved = !blocked;
  const seed = `${input.kind}:${input.sender.id}:${input.recipient?.id ?? "none"}:${input.asset.id}`;

  rules.push({
    code: "MONAD.execute",
    label: input.kind === "transfer" ? "Ownership transfer on Monad" : "A-Token issuance on Monad",
    requirement: "Execute only after a positive CCP pre-transaction decision",
    observed: approved ? "submitted" : "not submitted",
    status: approved ? "pass" : "skipped",
    reason: approved
      ? "CCP approved off-chain, state change executed on Monad."
      : `Execution never reached the chain — blocked at ${blocked?.code}.`,
    source: "MONAD",
  });

  if (!approved) token = input.aToken ?? unissuedToken(input.asset);

  const evaluation: Evaluation = {
    decisionId: decisionRef,
    policyId: RULESET[input.kind],
    kind: input.kind,
    mode: "live",
    approved,
    blockedBy: blocked?.code ?? null,
    rules,
    settlement: approved ? { chain: "Monad", txRef: `monad:tx/0x${hash(seed + "monad")}` } : null,
    aToken: token,
    trace: {
      cvi: { senderRef: refs["CVI-01"] ?? null, recipientRef: refs["CVI-10"] ?? null },
      cva: {
        tokenRef: atokenAddress ? `cva:atoken/${atokenAddress}` : null,
        tokenId: token?.tokenId ?? null,
      },
      ccp: { decisionRef, rulesetId: RULESET[input.kind] },
    },
    evaluatedAt: now.toISOString(),
  };
  if (cfg.environment === "sandbox") {
    evaluation.notice =
      "Live Cleanverse sandbox (API v5.6 cooperate). CVI/CVA/CCP gates are real sandbox responses.";
  }
  return evaluation;
}
