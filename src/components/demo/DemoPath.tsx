import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

type Step = {
  n: string;
  label: string;
  target: string;
  say: string;
  action?: () => void;
};

function fire(detail: { action: string; counterparty?: string }) {
  window.dispatchEvent(new CustomEvent("mt:transfer", { detail }));
}

/**
 * The two-minute demo path. One button per beat so a live walkthrough is
 * deterministic: problem → passport → credentials → blocked → approved → trail.
 */
export function DemoPath() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const steps: Step[] = [
    { n: "01", label: "The problem", target: "machines", say: "Machine records are fragmented." },
    { n: "02", label: "Machine passport", target: "passport", say: "One verifiable asset record." },
    {
      n: "03",
      label: "CVI + CVA",
      target: "credentials",
      say: "Cleanverse verifies party and asset.",
    },
    {
      n: "04",
      label: "Mint A-Token",
      target: "issuance",
      say: "Issuer A-Pass → A-Token mint → CCP → Monad.",
      action: () => window.dispatchEvent(new CustomEvent("mt:issuance")),
    },
    {
      n: "05",
      label: "Transfer blocked",
      target: "transfer",
      say: "Unverified buyer → blocked before Monad.",
      action: () => {
        fire({ action: "select", counterparty: "Unknown" });
        window.setTimeout(() => fire({ action: "run" }), 900);
      },
    },
    {
      n: "06",
      label: "Transfer approved",
      target: "transfer",
      say: "Verified buyer → CCP approved → Monad settlement ref.",
      action: () => {
        fire({ action: "select", counterparty: "Equipment Fund B" });
        window.setTimeout(() => fire({ action: "run" }), 900);
      },
    },
    { n: "07", label: "Audit trail", target: "audit", say: "Ownership and history update." },
  ];

  const run = (i: number) => {
    const s = steps[i];
    if (!s) return;
    setStep(i);
    go(s.target);
    if (s.action) window.setTimeout(s.action, 1000);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden md:block">
      <div className="pointer-events-auto w-[280px] border border-border bg-background/85 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-cursor="open"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="mt-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Guided demo · 2 min
          </span>
          <span className="mt-mono text-[11px] text-muted-foreground">{open ? "−" : "+"}</span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-border"
            >
              <ol className="px-2 py-2">
                {steps.map((s, i) => (
                  <li key={s.n}>
                    <button
                      type="button"
                      onClick={() => run(i)}
                      data-cursor="select"
                      className={cn(
                        "flex w-full items-start gap-3 px-2 py-2 text-left transition-colors",
                        step === i ? "bg-primary/10" : "hover:bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-mono mt-0.5 text-[10px]",
                          step === i ? "text-primary" : "text-muted-foreground",
                        )}
                      >
                        {s.n}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[12px]">{s.label}</span>
                        <span className="block text-[11px] leading-snug text-muted-foreground">
                          {s.say}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => run(0)}
                  className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={() => run(Math.min(step + 1, steps.length - 1))}
                  className="mt-mono border border-foreground bg-foreground px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-background transition-colors hover:border-primary hover:bg-primary"
                >
                  Next beat
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
