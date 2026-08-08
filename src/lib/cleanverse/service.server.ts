/**
 * Cleanverse Track 1 orchestration (server-only).
 *
 * Order (docs + hackathon Track 1):
 *   Machine Passport → CVI (APassService) → CVA (ATokenService)
 *   → CCP (ComplianceService.verify_apass) → Monad settlement record
 *
 * LIVE  — credentials present; every gate is a real cooperate call. Fail closed.
 * DEMO  — local CCP engine over fixtures (no network). Clearly labelled.
 *
 * Never invent a successful Cleanverse result. Custom A-Token launch may be
 * attempted; if Sandbox returns ISSUE_FAILED, that fact is recorded and the
 * registered A-Token binding (aUSDC) is used for CCP — not a fabricated mint.
 */

import { maybeWriteRegistry } from "../monad/registry.server";
import { CleanverseError, readConfig } from "./api.server";
import { RULESET, atokenIdFor, evaluateCcp, hash, unissuedToken } from "./ccp";
import {
  APassService,
  ATokenService,
  CommonQueryService,
  ComplianceService,
} from "./services/index.server";
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

export async function evaluateWithCleanverse(input: PolicyInput): Promise<Evaluation> {
  const cfg = readConfig();
  if (!cfg) return evaluateCcp(input);

  const now = new Date();
  const rules: RuleResult[] = [];
  const refs: Record<string, string | null> = {};
  const notices: string[] = [];

  // 1 — CVI / A-Pass
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
      const lookup = await APassService.lookup(cfg, p.address);
      refs[p.code] = lookup.ref;
      const detail = [
        lookup.status !== undefined && lookup.status !== null ? `status ${lookup.status}` : null,
        lookup.tier ? `tier ${lookup.tier}` : null,
        lookup.countries.length ? `countries ${lookup.countries.join(",")}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      rules.push({
        code: `${p.code}.apass`,
        label: `${p.who} A-Pass`,
        requirement: "Cleanverse must return an active A-Pass for this wallet",
        observed: `${p.address.slice(0, 10)}… ${detail || lookup.envelope.message}`,
        status: lookup.active ? "pass" : "fail",
        reason: lookup.active
          ? `Requirement satisfied — A-Pass resolved (CVI). Country tags from query_apass: ${
              lookup.countries.length ? lookup.countries.join(",") : "none"
            }.`
          : `Cleanverse returned no active A-Pass (${lookup.envelope.code}: ${lookup.envelope.message}).`,
        source: "CVI",
      });
      if (lookup.active && lookup.countries.length) {
        rules.push({
          code: `${p.code}.countries`,
          label: `${p.who} A-Pass country tags`,
          requirement:
            "A-Pass country tags (ISO 3166-1 alpha-2) from Cleanverse for compliance context",
          observed: lookup.countries.join(","),
          status: "pass",
          reason:
            "Country tags returned by POST /query_apass. CCP may enforce A-Token country rules when configured by the issuer.",
          source: "CVI",
        });
      }
    } catch (error) {
      return failClosed(input, "CVI", errText(error));
    }
  }

  // CommonQuery surface — same deposit list used for CVA bind (docs Common Queries).
  try {
    const supported = await CommonQueryService.supportedAtokens(cfg);
    const count = supported.data?.tokens?.length ?? 0;
    notices.push(
      `CommonQuery query_deposit_atoken_list: ${count} registered A-Token(s) on ${cfg.chain}.`,
    );
  } catch {
    /* non-blocking — bindRegistered below is authoritative for CVA */
  }

  // 2 — CVA / A-Token: bind registered A-Token for CCP
  let atokenAddress: string | null = null;
  let token: AtokenRecord | null = input.aToken ?? null;
  try {
    const { envelope, bound } = await ATokenService.bindRegistered(cfg);
    atokenAddress = bound?.address ?? null;
    rules.push({
      code: "CVA-04.atoken",
      label: "A-Token registration",
      requirement: "The asset must resolve to an A-Token registered with Cleanverse",
      observed: atokenAddress
        ? `${bound?.symbol ?? "A-Token"} · ${atokenAddress.slice(0, 12)}…`
        : `no A-Token returned (${envelope.code}: ${envelope.message})`,
      status: atokenAddress ? "pass" : "fail",
      reason: atokenAddress
        ? "A-Token resolved from the Cleanverse asset registry and bound to the Machine Passport."
        : "Cleanverse returned no registered A-Token for this asset.",
      source: "CVA",
    });

    // Custom /atoken/launch on Monad UAT currently ends ISSUE_FAILED (verified in audit).
    // We bind CCP to the registered A-Token and never fabricate an ISSUED custom mint.
    if (input.kind === "issuance") {
      notices.push(
        "Custom A-Token launch is Sandbox-unavailable on Monad (ISSUE_FAILED). CVA gate uses the registered A-Token from query_deposit_atoken_list.",
      );
    }

    if (atokenAddress) {
      token = {
        ref: `cva:atoken/${atokenAddress}`,
        tokenId: bound?.symbol
          ? `${bound.symbol}:${atokenIdFor(input.asset)}`
          : atokenIdFor(input.asset),
        credentialId: input.asset.id,
        passportId: input.asset.subject.passportId,
        status: input.kind === "issuance" ? "bound" : (input.aToken?.status ?? "active"),
        transferable: input.asset.transferable,
        attestations: input.asset.attestations.filter((a) => a.status === "valid").length,
        mintedAt: input.aToken?.mintedAt ?? now.toISOString(),
        contractAddress: atokenAddress,
      };
      notices.push(
        `CVA: bound registered A-Token ${bound?.symbol ?? "A-Token"} at ${atokenAddress.slice(0, 12)}… (not a custom /atoken/launch mint).`,
      );
    }
  } catch (error) {
    return failClosed(input, "CVA", errText(error));
  }

  // 3 — CCP via verify_apass (data.code 4 only)
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
        const verdict = await ComplianceService.verifyTransferEligibility(
          cfg,
          atokenAddress,
          s.address,
        );
        rules.push({
          code: `${s.code}.pretx`,
          label: `CCP pre-transaction · ${s.who}`,
          requirement:
            "Cleanverse must permit this party to move the A-Token (verify_apass data.code 4)",
          observed: `verify_apass data.code ${verdict.code} · ${verdict.envelope.data?.message ?? verdict.envelope.message}`,
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

  if (!approved) token = input.aToken ?? unissuedToken(input.asset);

  let settlement: Evaluation["settlement"] = null;
  // CRITICAL: Monad writes only after live CVI + CVA + CCP all pass (approved).
  // ComplianceFailed / non-code-4 → approved=false → no chain submission.
  if (approved) {
    const cviOk = rules.filter((r) => r.source === "CVI").every((r) => r.status !== "fail");
    const cvaOk = rules.filter((r) => r.source === "CVA").every((r) => r.status !== "fail");
    const ccpOk = rules.filter((r) => r.source === "CCP").every((r) => r.status === "pass");
    if (!(cviOk && cvaOk && ccpOk)) {
      notices.push(
        "Monad write blocked — Cleanverse CVI/CVA/CCP gate incomplete even though aggregate approved flag was true.",
      );
    } else {
      const write = await maybeWriteRegistry({
        kind: input.kind,
        machineKey: input.asset.subject.passportId,
        passportId: input.asset.subject.passportId,
        cleanverseAssetRef: atokenAddress ?? token?.tokenId ?? input.asset.id,
        ownerAddress: input.sender.holder.wallet,
        recipientAddress: input.recipient?.holder.wallet ?? null,
        decisionRef,
      });

      if (write.ok) {
        settlement = {
          chain: "Monad",
          txRef: write.txHash,
          kind: "on-chain",
          explorerUrl: write.explorerUrl,
          registryAddress: write.registryAddress,
          ownerAddress: write.ownerAddress,
        };
        notices.push(
          `Monad Testnet registry write confirmed: ${write.txHash} · owner ${write.ownerAddress}`,
        );
      } else {
        settlement = {
          chain: "Monad",
          txRef: `monad:settlement/0x${hash(seed + "monad")}`,
          kind: "demo-settlement-ref",
        };
        if (write.kind === "error") {
          notices.push(
            `Monad registry write failed — keeping DEMO settlement ref. ${write.reason}`,
          );
        } else {
          notices.push(
            "Monad registry not fully configured — DEMO settlement reference recorded (not an explorer hash).",
          );
        }
      }
    }
  }

  rules.push({
    code: "MONAD.execute",
    label: input.kind === "transfer" ? "Ownership transfer on Monad" : "Machine registry on Monad",
    requirement: "Record settlement only after a positive CCP pre-transaction decision",
    observed: settlement
      ? settlement.kind === "on-chain"
        ? `on-chain ${settlement.txRef}`
        : "settlement-ref recorded"
      : "not submitted",
    status: approved ? "pass" : "skipped",
    reason: approved
      ? settlement?.kind === "on-chain"
        ? "CCP approved. MachineTrustRegistry write confirmed on Monad."
        : "CCP approved off-chain. Machine Trust recorded a DEMO Monad settlement reference (registry write not configured or skipped)."
      : `Execution never reached the chain — blocked at ${blocked?.code}.`,
    source: "MONAD",
  });

  const evaluation: Evaluation = {
    decisionId: decisionRef,
    policyId: RULESET[input.kind],
    kind: input.kind,
    mode: "live",
    approved,
    blockedBy: blocked?.code ?? null,
    rules,
    settlement,
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

  const sandboxNotice =
    "Live Cleanverse sandbox (API v5.6). CVI/CVA/CCP gates are real UAT responses. On-chain registry writes require MACHINETRUST_REGISTRY_ADDRESS + Monad operator key; otherwise settlement refs stay DEMO.";
  evaluation.notice = [sandboxNotice, ...notices].filter(Boolean).join(" ");
  return evaluation;
}
