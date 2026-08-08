/**
 * Cleanverse service layer.
 *
 * One entry point per Track 1 primitive, orchestrated in the required order:
 *   CVI (A-Pass) → CVA (A-Token) → CCP pre-transaction → Monad execution.
 *
 * LIVE   — when CLEANVERSE_API_URL + CLEANVERSE_API_KEY are set, the calls hit
 *          the Cleanverse API and the response drives the decision.
 * DEMO   — otherwise the local CCP engine evaluates the local A-Pass/A-Token
 *          fixtures. Failures are never smoothed over into a fake approval.
 */

import { ccpPreTransaction, mintAtoken, readConfig, verifyApass } from "./api.server";
import { RULESET, atokenIdFor, evaluateCcp, hash, mintedToken, unissuedToken } from "./ccp";
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
    notice: "Live Cleanverse endpoint unreachable — no result was simulated.",
  };
}

function str(v: unknown, fallback: string) {
  return typeof v === "string" && v.length ? v : fallback;
}

export async function evaluateWithCleanverse(input: PolicyInput): Promise<Evaluation> {
  const cfg = readConfig();
  if (!cfg) return evaluateCcp(input);

  const now = new Date();
  const rules: RuleResult[] = [];

  // 1 — CVI / A-Pass for every party in the transaction.
  const parties = [
    { who: input.kind === "issuance" ? "Issuer" : "Holder", cred: input.sender, code: "CVI-01" },
    ...(input.kind === "transfer" && input.recipient
      ? [{ who: "Recipient", cred: input.recipient, code: "CVI-10" }]
      : []),
  ];
  const apassRefs: Record<string, string | null> = {};
  for (const p of parties) {
    try {
      const r = await verifyApass(cfg, p.cred.holder.did);
      const verified = r["verified"] === true || r["status"] === "active";
      apassRefs[p.code] = str(r["id"] ?? r["ref"], p.cred.holder.did);
      rules.push({
        code: `${p.code}.apass`,
        label: `${p.who} A-Pass`,
        requirement: "Cleanverse must return an active A-Pass for this holder DID",
        observed: `${p.cred.holder.did} · ${str(r["status"], verified ? "active" : "unverified")}`,
        status: verified ? "pass" : "fail",
        reason: verified
          ? "Requirement satisfied."
          : "Cleanverse did not return an active A-Pass for this holder.",
        source: "CVI",
      });
    } catch (error) {
      return failClosed(input, "CVI", error instanceof Error ? error.message : "unknown error");
    }
  }

  // 2 — CVA / A-Token: minted at issuance, resolved for transfer.
  let token: AtokenRecord | null = input.aToken ?? null;
  if (input.kind === "issuance" && rules.every((r) => r.status === "pass")) {
    try {
      const r = await mintAtoken(cfg, {
        credentialId: input.asset.id,
        passportId: input.asset.subject.passportId,
        serial: input.asset.subject.serial,
        issuerDid: cfg.issuerDid ?? input.sender.holder.did,
      });
      token = {
        ref: str(r["txRef"] ?? r["ref"], `cva:tx/${hash(input.asset.id)}`),
        tokenId: str(r["tokenId"] ?? r["id"], atokenIdFor(input.asset)),
        credentialId: input.asset.id,
        passportId: input.asset.subject.passportId,
        status: "minted",
        transferable: input.asset.transferable,
        attestations: input.asset.attestations.filter((a) => a.status === "valid").length,
        mintedAt: now.toISOString(),
      };
      rules.push({
        code: "CVA-04.mint",
        label: "A-Token mint",
        requirement: "Cleanverse must mint the A-Token bound to the Machine Passport",
        observed: token.tokenId,
        status: "pass",
        reason: "A-Token minted against the passport and bound to the issuer A-Pass.",
        source: "CVA",
      });
    } catch (error) {
      return failClosed(input, "CVA", error instanceof Error ? error.message : "unknown error");
    }
  }

  // 3 — CCP pre-transaction decision.
  try {
    const decision = await ccpPreTransaction(cfg, {
      rulesetId: RULESET[input.kind],
      intent: input.kind,
      subject: input.asset.subject.passportId,
      holderDid: input.sender.holder.did,
      counterpartyDid: input.recipient?.holder.did ?? null,
      aTokenId: token?.tokenId ?? null,
    });
    const approvedByCcp = decision["approved"] === true || decision["decision"] === "allow";
    const remote = Array.isArray(decision["rules"]) ? (decision["rules"] as RuleResult[]) : [];
    rules.push(
      ...remote.map((r) => ({ ...r, source: (r.source ?? "CCP") as RuleResult["source"] })),
    );
    if (!remote.length) {
      rules.push({
        code: "CCP-00.decision",
        label: "CCP pre-transaction decision",
        requirement: "Cleanverse Compliance Protocol must allow the transaction",
        observed: str(decision["decision"], approvedByCcp ? "allow" : "deny"),
        status: approvedByCcp ? "pass" : "fail",
        reason: str(decision["reason"], approvedByCcp ? "Requirement satisfied." : "CCP denied the transaction."),
        source: "CCP",
      });
    }

    const blocked = rules.find((r) => r.status === "fail") ?? null;
    const approved = !blocked && approvedByCcp;
    const seed = `${input.kind}:${input.sender.id}:${input.recipient?.id ?? "none"}:${input.asset.id}`;

    rules.push({
      code: "MONAD.execute",
      label: input.kind === "transfer" ? "Ownership transfer on Monad" : "A-Token issuance on Monad",
      requirement: "Execute only after a positive CCP pre-transaction decision",
      observed: approved ? "submitted" : "not submitted",
      status: approved ? "pass" : "skipped",
      reason: approved
        ? "CCP approved off-chain, state change executed on Monad."
        : `Execution never reached the chain — blocked at ${blocked?.code ?? "CCP-00.decision"}.`,
      source: "MONAD",
    });

    if (input.kind === "issuance" && !approved) token = unissuedToken(input.asset);
    if (input.kind === "issuance" && approved && !token) token = mintedToken(input.asset, now);

    const decisionRef = str(decision["decisionId"] ?? decision["id"], `ccp:decision/${hash(seed)}`);
    return {
      decisionId: decisionRef,
      policyId: RULESET[input.kind],
      kind: input.kind,
      mode: "live",
      approved,
      blockedBy: blocked?.code ?? (approvedByCcp ? null : "CCP-00.decision"),
      rules,
      settlement: approved
        ? { chain: "Monad", txRef: str(decision["txRef"], `monad:tx/0x${hash(seed + "monad")}`) }
        : null,
      aToken: token,
      trace: {
        cvi: { senderRef: apassRefs["CVI-01"] ?? null, recipientRef: apassRefs["CVI-10"] ?? null },
        cva: { tokenRef: token?.mintedAt ? token.ref : null, tokenId: token?.tokenId ?? null },
        ccp: { decisionRef, rulesetId: RULESET[input.kind] },
      },
      evaluatedAt: now.toISOString(),
    };
  } catch (error) {
    return failClosed(input, "CCP", error instanceof Error ? error.message : "unknown error");
  }
}