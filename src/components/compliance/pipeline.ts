import type { Evaluation, PolicyKind } from "@/lib/cleanverse-adapter";

export type PipelineStageId =
  | "UNKNOWN"
  | "VERIFYING"
  | "VERIFIED_IDENTITY"
  | "VERIFIED_ASSET"
  | "COMPLIANCE_APPROVED"
  | "RWA_ISSUED"
  | "TRANSFER_APPROVED"
  | "OWNERSHIP_UPDATED"
  | "BLOCKED";

export function derivePipelineStage(
  kind: PolicyKind,
  state: "idle" | "running" | "done",
  result: Evaluation | null,
  revealed: number,
): PipelineStageId {
  if (state === "idle") return "UNKNOWN";
  if (state === "running") {
    if (!result && revealed === 0) return "VERIFYING";
    if (revealed <= 1) return "VERIFYING";
    if (revealed <= 2) return "VERIFIED_IDENTITY";
    if (revealed <= 3) return "VERIFIED_ASSET";
    return "COMPLIANCE_APPROVED";
  }
  if (!result) return "UNKNOWN";
  if (!result.approved) return "BLOCKED";
  return kind === "issuance" ? "RWA_ISSUED" : "OWNERSHIP_UPDATED";
}
