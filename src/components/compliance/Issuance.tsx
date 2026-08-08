import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal, DemoTag } from "@/components/primitives";
import { demoMachine } from "@/data/demoMachine";
import {
  previewEvaluation,
  requestEvaluation,
  type RuleResult,
} from "@/lib/cleanverse-adapter";
import { useCleanverse } from "@/lib/cleanverse-state";
import { useAssetState } from "@/lib/asset-state";
import { CheckSequence, type SequenceState } from "./CheckSequence";

export function Issuance() {
  const { issuer: issuerCredential, asset, mode, recordDecision } = useCleanverse();
  const { markIssued } = useAssetState();
  const [state, setState] = useState<SequenceState>("idle");
  const [checks, setChecks] = useState<RuleResult[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [txRef, setTxRef] = useState<string | null>(null);

  const preview = previewEvaluation({
    kind: "issuance",
    sender: issuerCredential,
    recipient: null,
    asset,
  }).rules;

  async function run() {
    if (state === "running") return;
    setState("running");
    setRevealed(0);
    setTxRef(null);
    const result = await requestEvaluation({
      kind: "issuance",
      sender: issuerCredential,
      recipient: null,
      asset,
    });
    setChecks(result.rules);
    for (let i = 1; i <= result.rules.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setRevealed(i);
      if (result.rules[i - 1]?.status === "fail") {
        setRevealed(result.rules.length);
        break;
      }
    }
    setTxRef(result.settlement?.txRef ?? null);
    recordDecision(result);
    if (result.approved) markIssued();
    setState("done");
  }

  return (
    <Section id="issuance" label="RWA issuance" className="scroll-mt-16">
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <Eyebrow index="06">RWA issuance</Eyebrow>
            <Heading>Issue the machine as a compliant asset.</Heading>
            <Lede>
              Issuance is not a mint button. The issuer's CVI credential and every CVA attestation
              on the passport are evaluated before anything is written to the settlement layer.
            </Lede>
            <div className="mt-8 border border-border bg-surface/50">
              <div className="border-b border-border px-5 py-4">
                <p className="mt-label">Machine</p>
                <p className="mt-2 text-[15px]">{demoMachine.model}</p>
                <p className="mt-mono mt-1 text-[12px] text-muted-foreground">
                  {demoMachine.id} · {demoMachine.serial}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-background px-5 py-4">
                  <p className="mt-label">Indicative value</p>
                  <p className="mt-mono mt-1.5 text-[13px]">{demoMachine.valuation}</p>
                </div>
                <div className="bg-background px-5 py-4">
                  <p className="mt-label">Issuer</p>
                  <p className="mt-1.5 text-[13px]">{issuerCredential.holder.name}</p>
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
                  <p className="mt-label">Issuer · CVI</p>
                  <p className="mt-mono mt-1.5 text-[12px] text-success">
                    {issuerCredential.status.toUpperCase()} · TIER {issuerCredential.kycTier}
                  </p>
                </div>
                <div className="bg-background px-4 py-4">
                  <p className="mt-label">Asset · CVA</p>
                  <p className="mt-mono mt-1.5 text-[12px] text-success">
                    {asset.status.toUpperCase()} ·{" "}
                    {asset.attestations.filter((a) => a.status === "valid").length}/
                    {asset.attestations.length} ATT
                  </p>
                </div>
              </div>

              <div className="mt-7">
                <CheckSequence
                  checks={checks.length ? checks : preview}
                  revealed={revealed}
                  state={state}
                />
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
                    <p className="mt-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                      Machine asset issued
                    </p>
                    <p className="mt-mono mt-2 text-[12px] text-muted-foreground">
                      {txRef} · simulated settlement · policy MT-POLICY-ISSUANCE-v1 · mode {mode}
                    </p>
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

