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

function fire(detail: { action: string; wallet?: string }) {
  window.dispatchEvent(new CustomEvent("mt:lending", { detail }));
}

/**
 * 90–120s Track 2 demo: identity gate → blocked path → verified path → loan lifecycle.
 */
export function DemoPath() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const steps: Step[] = [
    {
      n: "01",
      label: "The pitch",
      target: "hero",
      say: "Verified identity unlocks compliant machine finance.",
    },
    {
      n: "02",
      label: "Machine passport",
      target: "passport",
      say: "Passport is context — not automatic collateral.",
    },
    {
      n: "03",
      label: "Path A · blocked",
      target: "finance",
      say: "Unknown wallet → CVI fail → access denied.",
      action: () => {
        fire({ action: "connect", wallet: "unknown" });
        window.setTimeout(() => fire({ action: "check" }), 800);
      },
    },
    {
      n: "04",
      label: "Path B · verified",
      target: "finance",
      say: "ABC Manufacturing → CVI + CCP → pool unlocked.",
      action: () => {
        fire({ action: "connect", wallet: "borrower" });
        window.setTimeout(() => fire({ action: "check" }), 800);
      },
    },
    {
      n: "05",
      label: "Request loan",
      target: "finance",
      say: "Eligible borrower requests USDC financing.",
      action: () => fire({ action: "request" }),
    },
    {
      n: "06",
      label: "Borrow on Monad",
      target: "finance",
      say: "Approve → protocol execution → loan ACTIVE.",
      action: () => fire({ action: "borrow" }),
    },
    {
      n: "07",
      label: "Repay · closed",
      target: "finance",
      say: "Repayment settles · loan CLOSED.",
      action: () => fire({ action: "repay" }),
    },
  ];

  const run = (i: number) => {
    const s = steps[i];
    if (!s) return;
    setStep(i);
    go(s.target);
    if (s.action) window.setTimeout(s.action, 900);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40 hidden md:block">
      <div className="pointer-events-auto w-[300px] border border-border bg-background/85 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-cursor="open"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="mt-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Guided demo · 2 min · Track 2
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
              <ol className="max-h-[50vh] space-y-1 overflow-y-auto p-2">
                {steps.map((s, i) => (
                  <li key={s.n}>
                    <button
                      type="button"
                      onClick={() => run(i)}
                      className={cn(
                        "flex w-full flex-col gap-1 border px-3 py-2.5 text-left transition-colors",
                        step === i
                          ? "border-primary/50 bg-primary/10"
                          : "border-transparent hover:border-border",
                      )}
                    >
                      <span className="mt-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {s.n} · {s.label}
                      </span>
                      <span className="text-[12px] leading-snug text-foreground">{s.say}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
