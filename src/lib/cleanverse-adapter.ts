/**
 * CleanverseAdapter — the single boundary between the UI and Cleanverse.
 *
 * The UI imports nothing else: no endpoints, no keys, no policy logic. Every
 * decision travels CVI (A-Pass) → CVA (A-Token) → CCP → Monad through the
 * server function below, and comes back as one Evaluation with a full trace.
 *
 * Secrets and HTTP live only in `./cleanverse/api.server.ts` (Cleanverse API v5.6).
 */

import { evaluateCompliance, getCleanverseMode } from "./cleanverse.functions";
import { evaluateCcp, atokenIdFor, unissuedToken } from "./cleanverse/ccp";
import type { AtokenRecord, Evaluation, PolicyInput } from "./cleanverse/types";

export type {
  AtokenRecord,
  ApassVerification,
  CleanverseTrace,
  Evaluation,
  PolicyInput,
  PolicyKind,
  RuleResult,
  RuleSource,
} from "./cleanverse/types";

export { atokenIdFor, unissuedToken };

export async function requestEvaluation(input: PolicyInput): Promise<Evaluation> {
  let intendedMode: "demo" | "live" = "demo";
  try {
    intendedMode = await fetchCleanverseMode();
  } catch {
    intendedMode = "demo";
  }

  try {
    // Never let a stalled transport freeze the demo: fall back after 9s.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("cleanverse: transport timeout")), 9000),
    );
    const evaluation = (await Promise.race([
      evaluateCompliance({ data: input }),
      timeout,
    ])) as Evaluation;
    if (!evaluation?.rules?.length) throw new Error("cleanverse: empty evaluation");
    return evaluation;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "cleanverse: transport failure";
    const fallback = evaluateCcp(input);

    // Live Sandbox unreachable → fail closed. Never surface local CCP as a live approval.
    if (intendedMode === "live") {
      return {
        ...fallback,
        approved: false,
        blockedBy: "TRANSPORT",
        mode: "demo",
        degraded: true,
        settlement: null,
        notice: [
          `Fail-closed: ${reason}. Live Cleanverse Sandbox unreachable — transaction not approved.`,
          "Retry when the Cooperate API responds. Local CCP was not used as a substitute approval.",
        ].join(" "),
      };
    }

    // Demo mode (no credentials): local CCP is the intended engine — label it clearly.
    return {
      ...fallback,
      mode: "demo",
      degraded: true,
      notice: [
        `Degraded: ${reason}. Local CCP engine ran — not a live Cleanverse sandbox decision.`,
        fallback.notice,
      ]
        .filter(Boolean)
        .join(" "),
    };
  }
}

export async function fetchCleanverseMode(): Promise<"demo" | "live"> {
  try {
    const res = (await getCleanverseMode()) as { mode: "demo" | "live" };
    return res.mode;
  } catch {
    return "demo";
  }
}

/** Preview of the rules a request will be graded against, before running it. */
export function previewEvaluation(input: PolicyInput): Evaluation {
  return evaluateCcp(input);
}

export type { AtokenRecord as AToken };
