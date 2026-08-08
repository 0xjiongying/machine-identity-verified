import { motion } from "motion/react";
import type { RuleResult } from "@/lib/cleanverse-adapter";
import { cn } from "@/lib/utils";

export type SequenceState = "idle" | "running" | "done";

const SOURCE_TONE: Record<RuleResult["source"], string> = {
  CVI: "text-primary",
  CVA: "text-primary",
  CCP: "text-foreground",
  MONAD: "text-muted-foreground",
};

export function CheckSequence({
  checks,
  revealed,
  state,
}: {
  checks: RuleResult[];
  revealed: number;
  state: SequenceState;
}) {
  const progress = checks.length ? Math.min(revealed / checks.length, 1) : 0;

  return (
    <div aria-live="polite">
      <div className="relative h-px w-full bg-border" aria-hidden="true">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <ul className="mt-4 space-y-0">
        {checks.map((c, i) => {
          const shown = i < revealed;
          const failed = shown && c.status === "fail";
          const skipped = shown && c.status === "skipped";
          return (
            <li
              key={c.code}
              className={cn(
                "flex items-start justify-between gap-4 border-b border-border py-3 transition-opacity duration-300",
                shown ? "opacity-100" : "opacity-30",
              )}
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "mt-mono border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em]",
                      SOURCE_TONE[c.source],
                    )}
                  >
                    {c.source}
                  </span>
                  <span className="mt-mono text-[11px] uppercase tracking-[0.16em]">{c.label}</span>
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                  {shown ? c.reason : c.requirement}
                </p>
                <p className="mt-mono mt-1 text-[10px] text-muted-foreground/70">
                  {c.code} · observed: {c.observed}
                </p>
              </div>
              <span
                className={cn(
                  "mt-mono shrink-0 text-[12px]",
                  !shown
                    ? "text-muted-foreground"
                    : failed
                      ? "text-destructive"
                      : skipped
                        ? "text-muted-foreground"
                        : "text-success",
                )}
              >
                {!shown
                  ? state === "running"
                    ? "…"
                    : "—"
                  : failed
                    ? "✕"
                    : skipped
                      ? "∅"
                      : "✓"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
