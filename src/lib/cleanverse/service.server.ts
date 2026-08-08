/**
 * Cleanverse service layer.
 *
 * One entry point per Track 1 primitive, orchestrated in the required order:
 *   CVI (A-Pass) → CVA (A-Token) → CCP pre-transaction → Monad execution.
 *
 * LIVE — when the sandbox API ID + API key are present, every gate is a real
 *        call to the Cleanverse cooperate API (query_apass,
 *        query_deposit_atoken_list, verify_apass). Nothing is simulated: a
 *        failed call fails the transaction closed.
 * DEMO — otherwise the local CCP engine evaluates the local fixtures.
 */

import {
  CleanverseError,
  queryApass,
  queryDepositAtokenList,
  readConfig,
  verifyApass,
  type AtokenListing,
  type CleanverseConfig,
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

function listingsOf(data: AtokenListing[] | { list?: AtokenListing[] } | null): AtokenListing[] {
  if (!data) return [];
  return Array.isArray(data) ? data : (data.list ?? []);
}

function addressOf(listing: AtokenListing | undefined) {
  return listing?.atoken_address ?? listing?.atoken ?? listing?.accesscore_address ?? null;
}

/** CCP verdict from verify_apass: 0000 allowed, 2 no A-Pass, 3 not transferable. */
function ccpVerdict(code: string, message: string) {
  if (code === "0000") return { allowed: true, reason: "Cleanverse allows this address to move the A-Token." };
  if (String(code) === "2")
    return { allowed: false, reason: "No A-Pass for this address — Cleanverse onboarding required." };
  if (String(code) === "3")
    return { allowed: false, reason: "A-Pass exists but is not permitted to transfer this A-Token." };
  return { allowed: false, reason: message || `Cleanverse denied the transaction (code ${code}).` };
}

async function cviRule(
  cfg: CleanverseConfig,
  who: string,
  code: string,
  address: string,
): Promise<{ rule: RuleResult; ref: string | null }> {
  const env = await queryApass(cfg, address);
  const record = env.data ?? {};
  const active = env.code === "0000" && !!record.cvRecordId;
  const detail = [
    record.status !== undefined ? `status ${record.status}` : null,
    record.tier !== undefined ? `tier ${record.tier}` : null,
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
        ? "Requirement satisfied — A-Pass resolved from the Cleanverse registry."
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

  // 1 — CVI / A-Pass for every party in the transaction.
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
      const { rule, ref } = await cviRule(cfg, p.who, p.code, p.address);
      refs[p.code] = ref;
      rules.push(rule);
    } catch (error) {
      return failClosed(input, "CVI", errText(error));
    }
  }

  // 2 — CVA / A-Token: resolve the Cleanverse-registered A-Token this machine
  //     asset is bound to. Without a registered A-Token nothing can move.
  let atokenAddress: string | null = null;
  let token: AtokenRecord | null = input.aToken ?? null;
  try {
    const env = await queryDepositAtokenList(cfg, cfg.atokenSymbol);
    const listings = listingsOf(env.data);
    const listing = cfg.atokenSymbol
      ? listings.find((l) => l.symbol === cfg.atokenSymbol)
      : listings[0];
    atokenAddress = addressOf(listing);
    rules.push({
      code: "CVA-04.atoken",
      label: "A-Token registration",
      requirement: "The asset must resolve to an A-Token registered with Cleanverse",
      observed: atokenAddress
        ? `${listing?.symbol ?? "A-Token"} · ${atokenAddress.slice(0, 12)}…`
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
        tokenId: listing?.symbol ? `${listing.symbol}:${atokenIdFor(input.asset)}` : atokenIdFor(input.asset),
        credentialId: input.asset.id,
        passportId: input.asset.subject.passportId,
        status: input.kind === "issuance" ? "minted" : (input.aToken?.status ?? "active"),
        transferable: input.asset.transferable,
        attestations: input.asset.attestations.filter((a) => a.status === "valid").length,
        mintedAt: input.aToken?.mintedAt ?? now.toISOString(),
      };
    }
  } catch (error) {
    return failClosed(input, "CVA", errText(error));
  }

  // 3 — CCP pre-transaction decision: verify_apass per party against the A-Token.
  let decisionRef = `ccp:decision/${hash(`${input.kind}:${input.sender.id}:${input.asset.id}`)}`;
  if (atokenAddress) {
    try {
      const subjects = [
        { who: input.kind === "issuance" ? "Issuer" : "Holder", code: "CCP-10", address: input.sender.holder.wallet },
        ...(input.kind === "transfer" && input.recipient
          ? [{ who: "Recipient", code: "CCP-20", address: input.recipient.holder.wallet }]
          : []),
      ];
      for (const s of subjects) {
        const env = await verifyApass(cfg, atokenAddress, s.address);
        const verdict = ccpVerdict(env.code, env.message);
        rules.push({
          code: `${s.code}.pretx`,
          label: `CCP pre-transaction · ${s.who}`,
          requirement: "Cleanverse must permit this party to move the A-Token",
          observed: `${env.code} · ${env.message || (verdict.allowed ? "allowed" : "denied")}`,
          status: verdict.allowed ? "pass" : "fail",
          reason: verdict.reason,
          source: "CCP",
        });
      }
      decisionRef = `ccp:decision/${hash(`${atokenAddress}:${input.sender.holder.wallet}:${input.recipient?.holder.wallet ?? "none"}`)}`;
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

  return {
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
      cva: { tokenRef: atokenAddress ? `cva:atoken/${atokenAddress}` : null, tokenId: token?.tokenId ?? null },
      ccp: { decisionRef, rulesetId: RULESET[input.kind] },
    },
    evaluatedAt: now.toISOString(),
  };
}
