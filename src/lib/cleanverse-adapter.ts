/**
 * CleanverseAdapter — the single boundary between the UI and Cleanverse.
 *
 * The UI imports nothing else: no endpoints, no keys, no policy logic. Every
 * decision travels CVI (A-Pass) → CVA (A-Token) → CCP → Monad through the
 * server function below, and comes back as one Evaluation with a full trace.
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
  RuleResult,
  RuleSource,
} from "./cleanverse/types";

export { atokenIdFor, unissuedToken };

export async function requestEvaluation(input: PolicyInput): Promise<Evaluation> {
  try {
    return (await evaluateCompliance({ data: input })) as Evaluation;
  } catch {
    // Transport failure: run the same deterministic CCP engine the server runs,
    // still clearly marked as demo mode.
    return evaluateCcp(input);
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
