import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { useCleanverse } from "@/lib/cleanverse-state";
import { MACHINE_TRUST_REGISTRY_DEPLOYMENT } from "@/lib/monad/explorer";
import { cn } from "@/lib/utils";

type Step = {
  n: string;
  label: string;
  target: string;
  /** Short path description under the step title. */
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
 * Compact Demo Controller — navigation only.
 * Product UI stays the visual hero; controller must not cover the 3D machine.
 */
export function DemoPath() {
  const { mode } = useCleanverse();
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState<string | null>(null);

  useEffect(() => {
    const openDemo = () => {
      setOpen(true);
      setDrawerOpen(false);
      setCaption("Machine Trust · Track 1 · Demo Controller");
    };
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1" || params.get("record") === "1") openDemo();
    window.addEventListener("mt:open-demo", openDemo);
    return () => window.removeEventListener("mt:open-demo", openDemo);
  }, []);

  const go = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const steps: Step[] = useMemo(
    () => [
      {
        n: "01",
        label: "Problem + product",
        target: "hero",
        say: "Fragmented machine records → Machine Trust RWA",
        caption: "PROBLEM → fragmented machine records · PRODUCT → Machine Trust RWA",
        holdMs: 4000,
      },
      {
        n: "02",
        label: "Machine Passport",
        target: "inspect",
        say: "Interactive 3D → Machine Passport",
        caption: "MACHINE PASSPORT · interactive 3D → identity record",
        holdMs: 3500,
        action: () => {
          window.setTimeout(() => go("passport"), 2200);
        },
      },
      {
        n: "03",
        label: "CVI",
        target: "credentials",
        say: "Issuer A-Pass must verify before issuance",
        caption: "CVI / A-PASS · ISSUER → verified identity gate",
        holdMs: 4000,
      },
      {
        n: "04",
        label: "ISSUE RWA",
        target: "issuance",
        say: "CVI verified → CVA bound → CCP cleared → RWA issued",
        caption: "04 ISSUE RWA · CVI verified → CVA bound → CCP cleared → RWA issued",
        waitEvent: "mt:issuance-done",
        action: () => window.dispatchEvent(new CustomEvent("mt:issuance")),
      },
      {
        n: "05",
        label: "TRANSFER BLOCKED",
        target: "transfer",
        say: "CVI missing → CCP rejects → no settlement",
        caption: "05 TRANSFER BLOCKED · CVI missing → CCP rejects → no settlement",
        waitEvent: "mt:transfer-done",
        action: () => {
          fireTransfer({ action: "select", counterparty: "Unknown" });
          window.setTimeout(() => fireTransfer({ action: "run" }), 700);
        },
      },
      {
        n: "06",
        label: "TRANSFER APPROVED",
        target: "transfer",
        say: "CVI verified → CVA eligible → CCP approved",
        caption: "06 TRANSFER APPROVED · Verified Buyer · CVI → CVA → CCP",
        waitEvent: "mt:transfer-done",
        holdMs: 2800,
        action: () => {
          // Data model id remains Equipment Fund B; UI copy says Verified Buyer.
          fireTransfer({ action: "select", counterparty: "Equipment Fund B" });
          window.setTimeout(() => fireTransfer({ action: "run" }), 700);
        },
      },
      {
        n: "07",
        label: "OWNERSHIP + MONAD",
        target: "passport",
        say: "Compliance passed → Monad settlement → ownership updated → audit recorded",
        caption: "07 OWNERSHIP + MONAD · compliance passed → Monad Testnet → ownership → audit",
        holdMs: 3500,
        action: () => {
          window.setTimeout(() => go("audit"), 2000);
        },
      },
      {
        n: "08",
        label: "Architecture",
        target: "architecture",
        say: "Passport → CVI → CVA → CCP → BLOCK|APPROVE → Monad → Ownership → Audit",
        caption: "FLOW · Passport → CVI → CVA → CCP → BLOCK | APPROVE → Monad → Ownership → Audit",
        holdMs: 4000,
      },
      {
        n: "09",
        label: "Scale",
        target: "overview",
        say: "Robotics wedge → industrial assets (roadmap)",
        caption: "SCALE · robotics wedge → industrial assets (roadmap labelled)",
        holdMs: 3000,
        action: () => {
          window.setTimeout(() => go("architecture"), 500);
        },
      },
    ],
    [go],
  );

  const current = steps[step] ?? steps[0]!;
  const progress = `${current.n}/${String(steps.length).padStart(2, "0")}`;
  const modeLabel = mode === "live" ? "LIVE Cleanverse" : "DEMO MODE";
  const monadLabel =
    MACHINE_TRUST_REGISTRY_DEPLOYMENT.cleanverseGate === "PASS"
      ? "MONAD TESTNET · real txs"
      : "MONAD TESTNET";

  const run = async (i: number) => {
    const s = steps[i];
    if (!s || busy) return;
    setBusy(true);
    setStep(i);
    setCaption(s.caption);
    setDrawerOpen(false);
    go(s.target);
    if (s.action) window.setTimeout(s.action, 900);
    if (s.waitEvent) await waitFor(s.waitEvent, 20000);
    if (s.holdMs) await new Promise((r) => setTimeout(r, s.holdMs));
    setBusy(false);
  };

  const stepList = (dense: boolean) => (
    <ol className={cn("space-y-0", dense ? "px-1 py-1" : "px-1.5 py-1.5")}>
      {steps.map((s, i) => (
        <li key={s.n}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(i)}
            data-cursor="select"
            className={cn(
              "flex w-full items-start gap-2 text-left transition-colors disabled:opacity-50",
              dense ? "px-1.5 py-1" : "px-2 py-1.5 gap-2.5",
              step === i ? "bg-primary/10" : "hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "mt-mono mt-0.5 shrink-0 text-[10px]",
                step === i ? "text-primary" : "text-muted-foreground",
              )}
            >
              {s.n}
            </span>
            <span className="min-w-0">
              <span className={cn("block leading-tight", dense ? "text-[11px]" : "text-[12px]")}>
                {s.label}
              </span>
              {!dense ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                  {s.say}
                </span>
              ) : null}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-40",
        // Bottom strip on mobile (keeps 3D clear). Bottom-right on desktop.
        "inset-x-2 bottom-2 sm:inset-x-auto sm:bottom-4 sm:right-4",
      )}
    >
      <AnimatePresence>
        {caption && open ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none mb-1 max-w-[min(300px,calc(100vw-1rem))] border border-primary/30 bg-background/80 px-2 py-1 backdrop-blur-md sm:ml-auto"
          >
            <p className="mt-mono text-[8px] uppercase tracking-[0.14em] leading-snug text-primary">
              {caption}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className={cn(
          "pointer-events-auto border border-border bg-background/92 backdrop-blur-md",
          // Compact footprint — never a dashboard over the product.
          "w-full max-w-[min(300px,calc(100vw-1rem))] sm:w-[280px] sm:max-w-[280px] sm:ml-auto",
        )}
      >
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            if (open) setDrawerOpen(false);
          }}
          data-cursor="open"
          className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left"
        >
          <span className="mt-mono text-[9px] uppercase tracking-[0.16em] text-primary">
            Demo Controller
          </span>
          <span className="mt-mono flex items-center gap-1.5 text-[9px] text-muted-foreground">
            {open ? progress : "01–09"}
            <span aria-hidden="true">{open ? "−" : "+"}</span>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-border"
            >
              <div className="flex flex-wrap gap-1 border-b border-border px-2.5 py-1">
                <span
                  className={cn(
                    "mt-mono text-[7px] uppercase tracking-[0.12em] px-1 py-0.5 border",
                    mode === "live"
                      ? "border-success/40 text-success"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {modeLabel}
                </span>
                <span className="mt-mono text-[7px] uppercase tracking-[0.12em] px-1 py-0.5 border border-border text-muted-foreground">
                  {monadLabel}
                </span>
              </div>

              {/* Current beat — primary mobile surface */}
              <div className="px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="mt-mono text-[9px] uppercase tracking-[0.14em] text-primary">
                    {current.n} {current.label}
                  </p>
                  <p className="mt-mono text-[9px] text-muted-foreground">{progress}</p>
                </div>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{current.say}</p>
              </div>

              {/* Desktop: compact full 01–09 navigator (dense, capped height) */}
              <div className="hidden max-h-[28vh] overflow-y-auto border-t border-border md:block">
                {stepList(true)}
              </div>

              {/* Mobile: collapsible drawer for full list */}
              <div className="border-t border-border md:hidden">
                <button
                  type="button"
                  onClick={() => setDrawerOpen((d) => !d)}
                  className="flex w-full items-center justify-between px-2.5 py-1 text-left"
                  aria-expanded={drawerOpen}
                >
                  <span className="mt-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
                    All steps 01–09
                  </span>
                  <span className="mt-mono text-[9px] text-muted-foreground">
                    {drawerOpen ? "Hide" : "Show"}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {drawerOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="max-h-[20vh] overflow-y-auto overflow-hidden border-t border-border"
                    >
                      {stepList(false)}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(0)}
                  className="mt-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Restart
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(Math.min(step + 1, steps.length - 1))}
                  className="mt-mono border border-foreground bg-foreground px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-background transition-colors hover:border-primary hover:bg-primary disabled:opacity-40"
                >
                  {busy ? "Running…" : "Next Beat"}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
