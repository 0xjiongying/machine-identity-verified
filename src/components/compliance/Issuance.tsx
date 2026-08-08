import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal, DemoTag } from "@/components/primitives";
import { demoMachine } from "@/data/demoMachine";
import { issuer } from "@/data/demoParticipants";
import { cleanverse, type CheckResult } from "@/lib/cleanverse-adapter";
import { CheckSequence, type SequenceState } from "./CheckSequence";

export function Issuance() {
  const [state, setState] = useState<SequenceState>("idle");
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [txRef, setTxRef] = useState<string | null>(null);

  async function run() {
    if (state === "running") return;
    setState("running");
    setRevealed(0);
    setTxRef(null);
    const result = await cleanverse.evaluateIssuance({ issuerVerified: issuer.cvi, assetEligible: true });
    setChecks(result.checks);
    for (let i = 1; i <= result.checks.length; i++) {
      await new Promise((r) => setTimeout(r, 420));
      setRevealed(i);
    }
    setTxRef(result.txRef ?? null);
    setState("done");
  }

  return (
    <Section label="RWA issuance">
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <Eyebrow index="04">RWA issuance</Eyebrow>
            <Heading>Issue the machine as a compliant asset.</Heading>
            <Lede>
              Issuance is not a mint button. The issuer identity and the asset record are both evaluated
              before anything is written to the settlement layer.
            </Lede>
            <div className="mt-8 border border-border bg-surface/50">
              <div className="border-b border-border px-5 py-4">
                <p className="mt-label">Machine</p>
                <p className="mt-2 text-[15px]">{demoMachine.model}</p>
                <p className="mt-mono mt-1 text-[12px] text-muted-foreground">{demoMachine.id} · {demoMachine.serial}</p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-background px-5 py-4">
                  <p className="mt-label">Indicative value</p>
                  <p className="mt-mono mt-1.5 text-[13px]">{demoMachine.valuation}</p>
                </div>
                <div className="bg-background px-5 py-4">
                  <p className="mt-label">Issuer</p>
                  <p className="mt-1.5 text-[13px]">{issuer.name}</p>
                </div>
              </div>
            </div>
            <DemoTag className="mt-5" />
          </Reveal>

          <Reveal delay={0.12}>
            <div className="border border-border bg-surface/50 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <p className="mt-mono text-[11px] uppercase tracking-[0.16em]">Issuance sequence</p>
                <span className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {state === "idle" ? "Ready" : state === "running" ? "Verifying" : "Issued"}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-px bg-border">
                <div className="bg-background px-4 py-4">
                  <p className="mt-label">Verify issuer · CVI</p>
                  <p className="mt-mono mt-1.5 text-[12px] text-success">✓ PASS</p>
                </div>
                <div className="bg-background px-4 py-4">
                  <p className="mt-label">Asset status · CVA</p>
                  <p className="mt-mono mt-1.5 text-[12px] text-success">✓ ELIGIBLE</p>
                </div>
              </div>

              <div className="mt-7">
                <CheckSequence checks={checks.length ? checks : placeholder} revealed={revealed} state={state} />
              </div>

              <AnimatePresence>
                {state === "done" && txRef ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-6 border border-primary/50 bg-primary/10 px-4 py-4"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.18em] text-primary">Machine asset issued</p>
                    <p className="mt-mono mt-2 text-[12px] text-muted-foreground">{txRef} · simulated settlement</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                onClick={run}
                data-cursor="issue"
                disabled={state === "running"}
                className="mt-7 w-full border border-foreground bg-foreground px-5 py-3 text-[13px] font-medium text-background transition-colors hover:border-primary hover:bg-primary disabled:opacity-50"
              >
                {state === "done" ? "Run issuance again" : "Issue Machine Asset"}
              </button>
            </div>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}

const placeholder: CheckResult[] = [
  { id: "identity", label: "Identity check", detail: "CVI — issuer credential", status: "pass" },
  { id: "asset", label: "Asset check", detail: "CVA — machine passport attested", status: "pass" },
  { id: "compliance", label: "Compliance policy", detail: "Issuance policy MT-ISS-01", status: "pass" },
  { id: "settlement", label: "Monad", detail: "Execution of approved issuance", status: "pass" },
];
