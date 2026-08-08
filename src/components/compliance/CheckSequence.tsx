import { motion } from "motion/react";
import type { CheckResult } from "@/lib/cleanverse-adapter";
import { cn } from "@/lib/utils";

export type SequenceState = "idle" | "running" | "done";

export function useSequenceLabels(checks: CheckResult[], revealed: number) {
  return checks.slice(0, revealed);
}

export function CheckSequence({
  checks,
  revealed,
  state,
}: {
  checks: CheckResult[];
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
          return (
            <li
              key={c.id}
              className={cn(
                "flex items-center justify-between gap-4 border-b border-border py-3 transition-opacity duration-300",
                shown ? "opacity-100" : "opacity-30",
              )}
            >
              <div className="min-w-0">
                <p className="mt-mono text-[11px] uppercase tracking-[0.16em]">{c.label}</p>
                <p className="mt-1 truncate text-[12px] text-muted-foreground">{c.detail}</p>
              </div>
              <span
                className={cn(
                  "mt-mono shrink-0 text-[12px]",
                  !shown ? "text-muted-foreground" : failed ? "text-destructive" : "text-success",
                )}
              >
                {!shown ? (state === "running" ? "…" : "—") : failed ? "✕" : "✓"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
