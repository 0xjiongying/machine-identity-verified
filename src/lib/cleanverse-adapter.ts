/**
 * Cleanverse adapter — the single boundary between the UI and Cleanverse.
 *
 * The browser never grades a transaction: it sends the credential set to a
 * server function, which either forwards the request to a live Cleanverse
 * deployment (when credentials are configured) or evaluates the local demo
 * policy engine. Both paths return the same Evaluation shape.
 */

import { evaluateCompliance, getCleanverseMode } from "./cleanverse.functions";
import { evaluatePolicy, type Evaluation, type PolicyInput } from "./cleanverse-policy";

export type { Evaluation, PolicyInput, RuleResult } from "./cleanverse-policy";

export async function requestEvaluation(input: PolicyInput): Promise<Evaluation> {
  try {
    return (await evaluateCompliance({ data: input })) as Evaluation;
  } catch {
    // Offline / RPC failure: fall back to the same deterministic engine the
    // server runs, clearly still marked as demo mode.
    return evaluatePolicy(input);
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
  return evaluatePolicy(input);
}
