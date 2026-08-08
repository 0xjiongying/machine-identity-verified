import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Section,
  Shell,
  Eyebrow,
  Heading,
  Lede,
  Reveal,
  StatusDot,
  DemoTag,
} from "@/components/primitives";
import { demoMachine } from "@/data/demoMachine";
import { issuer, recipients } from "@/data/demoParticipants";
import { cleanverse, type CheckResult, type EvaluationResult } from "@/lib/cleanverse-adapter";
import { CheckSequence, type SequenceState } from "@/components/compliance/CheckSequence";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { HashReveal } from "@/components/motion/HashReveal";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Transfer() {
  const [selected, setSelected] = useState<string | null>(null);
  const [state, setState] = useState<SequenceState>("idle");
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const recipient = recipients.find((r) => r.key === selected) ?? null;

  function reset() {
    setState("idle");
    setChecks([]);
    setRevealed(0);
    setResult(null);
  }

  async function run() {
    if (!recipient || state === "running") return;
    setState("running");
    setRevealed(0);
    setResult(null);
    const evaluation = await cleanverse.evaluateTransfer({
      issuerVerified: issuer.cvi,
      assetEligible: true,
      recipientVerified: recipient.cvi,
    });
    setChecks(evaluation.checks);
    for (let i = 1; i <= evaluation.checks.length; i++) {
      await new Promise((r) => setTimeout(r, 340));
      setRevealed(i);
      if (evaluation.checks[i - 1]?.status === "fail") break;
    }
    setResult(evaluation);
    setState("done");
    if (evaluation.approved) {
      setTimeout(() => {
        document.getElementById("audit")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 1100);
    }
  }

  return (
    <Section id="transfer" label="Compliant transfer" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="05">Compliant transfer</Eyebrow>
          <Heading>Trust is enforced at the point of transfer.</Heading>
          <Lede>
            A verified machine cannot move to an unverified counterparty. Compliance is not a badge
            on the page — it decides whether the transaction exists at all.
          </Lede>
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <Reveal>
            <div className="border border-border bg-surface/50">
              <div className="border-b border-border px-5 py-4">
                <p className="mt-label">From</p>
                <p className="mt-2 text-[15px]">{issuer.name}</p>
                <p className="mt-mono mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-success">
                  <StatusDot tone="ok" /> CVI verified
                </p>
              </div>
              <div className="border-b border-border px-5 py-4">
                <p className="mt-label">Asset</p>
                <p className="mt-2 text-[15px]">{demoMachine.model}</p>
                <p className="mt-mono mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-success">
                  <StatusDot tone="ok" /> CVA · asset status active
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="mt-label">Select recipient</p>
                <ul className="mt-3 grid gap-2">
                  {recipients.map((r) => (
                    <li key={r.key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(r.key);
                          reset();
                        }}
                        data-cursor="select"
                        aria-pressed={selected === r.key}
                        className={cn(
                          "flex w-full items-center justify-between gap-4 border px-4 py-3.5 text-left transition-colors",
                          selected === r.key
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-foreground",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="mt-label block">{r.role}</span>
                          <span className="mt-1.5 block truncate text-[14px]">{r.name}</span>
                          <span className="mt-mono mt-1 block text-[11px] text-muted-foreground">
                            {r.wallet}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "mt-mono shrink-0 text-right text-[10px] uppercase tracking-[0.16em]",
                            r.cvi ? "text-success" : "text-destructive",
                          )}
                        >
                          CVI {r.cvi ? "✓" : "✕"}
                          <span className="mt-1 block text-muted-foreground">
                            {r.cvi ? "Eligible" : "Ineligible"}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <MagneticButton
                  onClick={run}
                  disabled={!recipient || state === "running"}
                  cursor="transfer"
                  className="mt-5 w-full"
                >
                  {state === "running" ? (
                    <>
                      <motion.span
                        aria-hidden="true"
                        className="inline-block size-1.5 bg-background"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                      />
                      Running compliance check…
                    </>
                  ) : (
                    "Transfer Asset"
                  )}
                </MagneticButton>
                <DemoTag className="mt-4" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <motion.div
              animate={
                state === "done" && result && !result.approved
                  ? { x: [0, -9, 8, -5, 3, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.5, ease: EASE.power3Out }}
              className="relative h-full overflow-hidden border border-border bg-surface/50 p-5 sm:p-7"
            >
              {/* settlement energy sweeping the panel while checks run */}
              {state === "running" ? (
                <motion.div
                  aria-hidden="true"
                  className="mt-scanline pointer-events-none absolute inset-x-0 h-24"
                  initial={{ top: "-20%" }}
                  animate={{ top: ["-20%", "100%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                />
              ) : null}
              <p className="mt-mono text-[11px] uppercase tracking-[0.16em]">Compliance check</p>

              {!recipient ? (
                <p className="mt-6 text-[13px] text-muted-foreground">
                  Select a recipient to evaluate this transfer against the Cleanverse policy.
                </p>
              ) : (
                <div className="mt-6">
                  <CheckSequence
                    checks={checks.length ? checks : preview(recipient.cvi)}
                    revealed={revealed}
                    state={state}
                  />

                  <AnimatePresence mode="wait">
                    {state === "done" && result ? (
                      result.approved ? (
                        <motion.div
                          key="ok"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="mt-6 border border-primary/50 bg-primary/10 p-5"
                        >
                          <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                            Transfer approved
                          </p>
                          <p className="mt-label mt-4">Ownership updated</p>
                          <p className="mt-2 text-[15px]">{issuer.name}</p>
                          <p className="mt-mono my-1 text-primary" aria-hidden="true">
                            ↓
                          </p>
                          <p className="text-[15px]">{recipient.name}</p>
                          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-primary/30 pt-4">
                            <div>
                              <dt className="mt-label">Network</dt>
                              <dd className="mt-mono mt-1 text-[12px]">Monad</dd>
                            </div>
                            <div>
                              <dt className="mt-label">Status</dt>
                              <dd className="mt-mono mt-1 text-[12px] text-success">CONFIRMED</dd>
                            </div>
                          </dl>
                          <p className="mt-mono mt-4 text-[11px] text-muted-foreground">
                            <HashReveal value={result.txRef ?? ""} className="text-primary" /> · simulated
                            settlement reference
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="blocked"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="mt-6 border border-destructive/60 p-5"
                        >
                          <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-destructive">
                            Transfer blocked
                          </p>
                          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                            The recipient does not hold a Cleanverse identity credential. The
                            transfer policy rejects the transaction before settlement — ownership is
                            unchanged.
                          </p>
                        </motion.div>
                      )
                    ) : null}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}

function preview(recipientVerified: boolean): CheckResult[] {
  return [
    { id: "identity", label: "Issuer", detail: "CVI — sender credential", status: "pass" },
    { id: "asset", label: "Asset", detail: "CVA — asset status ACTIVE", status: "pass" },
    {
      id: "compliance",
      label: "Recipient",
      detail: "CVI — counterparty credential",
      status: recipientVerified ? "pass" : "fail",
    },
    {
      id: "policy",
      label: "Policy",
      detail: "Transfer policy MT-TRF-02",
      status: recipientVerified ? "pass" : "fail",
    },
    {
      id: "settlement",
      label: "Monad",
      detail: "Settlement of approved transfer",
      status: recipientVerified ? "pass" : "fail",
    },
  ];
}
