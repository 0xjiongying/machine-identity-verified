/**
 * Server-side Cleanverse boundary.
 *
 * LIVE MODE: when CLEANVERSE_API_URL + CLEANVERSE_API_KEY are configured, the
 * evaluation request is forwarded to Cleanverse and the response is mapped into
 * the same Evaluation shape the UI renders. Nothing is invented: if the call
 * fails, the failure is returned as a failure.
 *
 * DEMO MODE (default): the local policy engine evaluates local credential
 * fixtures. Every surface renders a DEMO badge so results are never mistaken
 * for production Cleanverse verifications.
 */

import { evaluatePolicy, type Evaluation, type PolicyInput } from "./cleanverse-policy";

export type CleanverseMode = "demo" | "live";

export function resolveMode(): CleanverseMode {
  return process.env["CLEANVERSE_API_URL"] && process.env["CLEANVERSE_API_KEY"]
    ? "live"
    : "demo";
}

export async function evaluateWithCleanverse(input: PolicyInput): Promise<Evaluation> {
  if (resolveMode() === "demo") {
    return evaluatePolicy(input);
  }

  const base = process.env["CLEANVERSE_API_URL"]!.replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/v1/policy/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env["CLEANVERSE_API_KEY"]!}`,
      },
      body: JSON.stringify({
        policy: input.kind === "transfer" ? "MT-POLICY-TRANSFER-v1" : "MT-POLICY-ISSUANCE-v1",
        subject: input.asset.subject.passportId,
        holder: input.sender.holder.did,
        counterparty: input.recipient?.holder.did ?? null,
      }),
    });
    if (!res.ok) throw new Error(`Cleanverse responded ${res.status}`);
    const payload = (await res.json()) as Evaluation;
    return { ...payload, mode: "live" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      decisionId: "cv:decision/unavailable",
      policyId: input.kind === "transfer" ? "MT-POLICY-TRANSFER-v1" : "MT-POLICY-ISSUANCE-v1",
      kind: input.kind,
      mode: "live",
      approved: false,
      blockedBy: "CLEANVERSE.unavailable",
      rules: [
        {
          code: "CLEANVERSE.unavailable",
          label: "Cleanverse policy service",
          requirement: "Policy decision must be returned by Cleanverse",
          observed: message,
          status: "fail",
          reason:
            "No decision was returned. Machine Trust fails closed: without a Cleanverse decision, nothing settles.",
          source: "POLICY",
        },
      ],
      settlement: null,
      evaluatedAt: new Date().toISOString(),
      notice: "Live Cleanverse endpoint unreachable — no result was simulated.",
    };
  }
}