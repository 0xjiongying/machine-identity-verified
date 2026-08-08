import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

type Step = {
  n: string;
  label: string;
  target: string;
  say: string;
  /** On-screen caption for silent video (no VO required). */
  caption: string;
  waitEvent?: "mt:issuance-done" | "mt:transfer-done";
  action?: () => void;
  holdMs?: number;
};

function fireTransfer(detail: { action: string; counterparty?: string }) {
  window.dispatchEvent(new CustomEvent("mt:transfer", { detail }));
}

function waitFor(event: string, timeoutMs: number) {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener(event, onEvt);
      resolve();
    };
    const onEvt = () => finish();
    window.addEventListener(event, onEvt);
    window.setTimeout(finish, timeoutMs);
  });
}

/**
 * Silent-video-friendly guided demo (Track 1 RWA, ~3.5–4 min).
 * Captions + waits make the story readable without narration.
 */
export function DemoPath() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);

  useEffect(() => {
    const openDemo = () => {
      setOpen(true);
      setCaption("Machine Trust · Track 1 RWA · silent demo mode");
    };
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" || params.get("record") === "1") openDemo();
    window.addEventListener("mt:open-demo", openDemo);
    return () => window.removeEventListener("mt:open-demo", openDemo);
  }, []);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const steps: Step[] = [
    {
      n: "01",
      label: "Problem + product",
      target: "hero",
      say: "Machines lack shared identity and compliance.",
      caption: "PROBLEM → fragmented machine records · PRODUCT → Machine Trust RWA",
      holdMs: 4000,
    },
    {
      n: "02",
      label: "3D + Passport",
      target: "inspect",
      say: "Inspect the machine, then open its passport.",
      caption: "INTERACTIVE 3D MACHINE → MACHINE PASSPORT",
      holdMs: 3500,
      action: () => {
        window.setTimeout(() => go("passport"), 2200);
      },
    },
    {
      n: "03",
      label: "CVI issuer",
      target: "credentials",
      say: "Issuer A-Pass is the identity gate.",
      caption: "CVI / A-PASS · ISSUER → must be VERIFIED before issuance",
      holdMs: 4000,
    },
    {
      n: "04",
      label: "Issue RWA",
      target: "issuance",
      say: "CVI → CVA bind → CCP → RWA issued.",
      caption: "ISSUANCE · CVI → CVA (bind aUSDC) → CCP → RWA ISSUED",
      waitEvent: "mt:issuance-done",
      action: () => window.dispatchEvent(new CustomEvent("mt:issuance")),
    },
    {
      n: "05",
      label: "Transfer blocked",
      target: "transfer",
      say: "Unknown wallet has no A-Pass.",
      caption: "BUYER A · UNVERIFIED → verify_apass code 2 → TRANSFER BLOCKED",
      waitEvent: "mt:transfer-done",
      action: () => {
        fireTransfer({ action: "select", counterparty: "Unknown" });
        window.setTimeout(() => fireTransfer({ action: "run" }), 700);
      },
    },
    {
      n: "06",
      label: "Transfer approved",
      target: "transfer",
      say: "Fund B clears CVI + CCP.",
      caption: "BUYER B · VERIFIED → verify_apass code 4 → APPROVED",
      waitEvent: "mt:transfer-done",
      holdMs: 2800,
      action: () => {
        fireTransfer({ action: "select", counterparty: "Equipment Fund B" });
        window.setTimeout(() => fireTransfer({ action: "run" }), 700);
      },
    },
    {
      n: "07",
      label: "Ownership + Monad",
      target: "passport",
      say: "Owner updates; settlement ref recorded.",
      caption: "MONAD SETTLEMENT REF → OWNERSHIP UPDATED · see Passport + Audit",
      holdMs: 3500,
      action: () => {
        window.setTimeout(() => go("audit"), 2000);
      },
    },
    {
      n: "08",
      label: "Architecture",
      target: "architecture",
      say: "Machine Trust · Cleanverse · Monad.",
      caption: "FLOW · Passport → CVI+CVA → CCP → BLOCK|APPROVE → Monad → Ownership → Audit",
      holdMs: 4000,
    },
    {
      n: "09",
      label: "Scale",
      target: "overview",
      say: "Robotics wedge; infrastructure expands.",
      caption: "SCALE · robotics wedge → industrial assets (roadmap labelled)",
      holdMs: 3000,
      action: () => {
        window.setTimeout(() => go("architecture"), 500);
      },
    },
  ];

  const run = async (i: number) => {
    const s = steps[i];
    if (!s || busy) return;
    setBusy(true);
    setStep(i);
    setCaption(s.caption);
    go(s.target);
    if (s.action) window.setTimeout(s.action, 900);
    if (s.waitEvent) await waitFor(s.waitEvent, 20000);
    if (s.holdMs) await new Promise((r) => setTimeout(r, s.holdMs));
    setBusy(false);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
      {/* Persistent silent-demo caption */}
      <AnimatePresence>
        {caption ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none mb-2 max-w-[min(360px,calc(100vw-2rem))] border border-primary/40 bg-background/90 px-3 py-2 backdrop-blur-md"
          >
            <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              {caption}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="pointer-events-auto w-[min(320px,calc(100vw-2rem))] border border-border bg-background/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-cursor="open"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="mt-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Guided demo · Track 1 · 4 min
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
              <p className="mt-mono px-3 pt-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                Tip: open with ?demo=1 for recording · captions = silent narration
              </p>
              <ol className="max-h-[45vh] space-y-0.5 overflow-y-auto px-2 py-2">
                {steps.map((s, i) => (
                  <li key={s.n}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(i)}
                      data-cursor="select"
                      className={cn(
                        "flex w-full items-start gap-3 px-2 py-2 text-left transition-colors disabled:opacity-50",
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
                  disabled={busy}
                  onClick={() => void run(0)}
                  className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Restart
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(Math.min(step + 1, steps.length - 1))}
                  className="mt-mono border border-foreground bg-foreground px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-background transition-colors hover:border-primary hover:bg-primary disabled:opacity-40"
                >
                  {busy ? "Running…" : "Next beat"}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
