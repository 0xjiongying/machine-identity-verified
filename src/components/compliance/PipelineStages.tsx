import { cn } from "@/lib/utils";
import type { PolicyKind } from "@/lib/cleanverse-adapter";
import type { PipelineStageId } from "./pipeline";

const ISSUANCE_STAGES: Array<{ id: PipelineStageId; label: string; layer: string }> = [
  { id: "UNKNOWN", label: "Unknown", layer: "MT" },
  { id: "VERIFYING", label: "Verifying", layer: "CVI" },
  { id: "VERIFIED_IDENTITY", label: "Verified identity", layer: "CVI" },
  { id: "VERIFIED_ASSET", label: "Verified asset", layer: "CVA" },
  { id: "COMPLIANCE_APPROVED", label: "Compliance approved", layer: "CCP" },
  { id: "RWA_ISSUED", label: "RWA issued", layer: "MONAD" },
];

const TRANSFER_STAGES: Array<{ id: PipelineStageId; label: string; layer: string }> = [
  { id: "UNKNOWN", label: "Unknown", layer: "MT" },
  { id: "VERIFYING", label: "Verifying", layer: "CVI" },
  { id: "VERIFIED_IDENTITY", label: "Buyer identity", layer: "CVI" },
  { id: "VERIFIED_ASSET", label: "A-Token eligible", layer: "CVA" },
  { id: "COMPLIANCE_APPROVED", label: "CCP approved", layer: "CCP" },
  { id: "TRANSFER_APPROVED", label: "Transfer approved", layer: "MONAD" },
  { id: "OWNERSHIP_UPDATED", label: "Ownership updated", layer: "MT" },
];

export function PipelineStages({ kind, active }: { kind: PolicyKind; active: PipelineStageId }) {
  const stages = kind === "issuance" ? ISSUANCE_STAGES : TRANSFER_STAGES;
  const blocked = active === "BLOCKED";
  const activeIndex = blocked
    ? stages.findIndex((s) => s.id === "COMPLIANCE_APPROVED")
    : Math.max(
        0,
        stages.findIndex((s) => s.id === active),
      );

  return (
    <ol className="mt-5 grid gap-1" aria-label="RWA pipeline stages">
      {stages.map((s, i) => {
        const reached = i <= activeIndex && active !== "UNKNOWN";
        const current = !blocked && s.id === active;
        const failed = blocked && i === activeIndex;
        return (
          <li
            key={s.id}
            className={cn(
              "flex items-center justify-between gap-3 border px-3 py-2 transition-colors",
              current
                ? "border-primary/50 bg-primary/10"
                : failed
                  ? "border-destructive/50 bg-destructive/10"
                  : reached
                    ? "border-border bg-background"
                    : "border-border/60 bg-transparent opacity-45",
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "mt-mono text-[9px] uppercase tracking-[0.18em]",
                  current ? "text-primary" : failed ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {s.layer}
              </span>
              <span className="text-[12px]">{s.label}</span>
            </span>
            <span
              className={cn(
                "mt-mono text-[10px]",
                current
                  ? "text-primary"
                  : failed
                    ? "text-destructive"
                    : reached
                      ? "text-success"
                      : "text-muted-foreground",
              )}
            >
              {failed ? "✕" : current ? "●" : reached ? "✓" : "—"}
            </span>
          </li>
        );
      })}
      {blocked ? (
        <li className="mt-1 border border-destructive/60 bg-destructive/10 px-3 py-2">
          <span className="mt-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
            BLOCKED — nothing submitted to Monad
          </span>
        </li>
      ) : null}
    </ol>
  );
}
