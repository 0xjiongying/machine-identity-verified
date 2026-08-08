import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Section,
  Shell,
  Eyebrow,
  Heading,
  Lede,
  Reveal,
  DemoTag,
  IntegrationModeTag,
} from "@/components/primitives";
import { demoMachine } from "@/data/demoMachine";
import {
  previewEvaluation,
  requestEvaluation,
  type Evaluation,
  type RuleResult,
} from "@/lib/cleanverse-adapter";
import { CleanverseMark } from "@/components/brand/CleanverseLogo";
import { useCleanverse } from "@/lib/cleanverse-state";
import { useAssetState } from "@/lib/asset-state";
import { CheckSequence, type SequenceState } from "./CheckSequence";
import { TraceStrip } from "./TraceStrip";
import { PipelineStages } from "./PipelineStages";
import { derivePipelineStage } from "./pipeline";
import { VerdictBanner } from "./VerdictBanner";

export function Issuance() {
  const {
    issuer: issuerCredential,
    asset,
    aToken,
    mode,
    recordDecision,
    setAToken,
  } = useCleanverse();
  const { markIssued, markVerified } = useAssetState();
  const [state, setState] = useState<SequenceState>("idle");
  const [checks, setChecks] = useState<RuleResult[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [result, setResult] = useState<Evaluation | null>(null);
  const runningRef = useRef(false);
  const stage = derivePipelineStage("issuance", state, result, revealed);

  const preview = previewEvaluation({
    kind: "issuance",
    sender: issuerCredential,
    recipient: null,
    asset,
  }).rules;

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setState("running");
    setRevealed(0);
    setResult(null);
    try {
      const evaluation = await requestEvaluation({
        kind: "issuance",
        sender: issuerCredential,
        recipient: null,
        asset,
      });
      const rules = evaluation.rules ?? [];
      setChecks(rules);
      for (let i = 1; i <= rules.length; i++) {
        await new Promise((r) => setTimeout(r, 300));
        setRevealed(i);
        if (rules[i - 1]?.status === "fail") {
          setRevealed(rules.length);
          break;
        }
      }
      setResult(evaluation);
      if (evaluation.aToken) setAToken(evaluation.aToken);
      recordDecision(evaluation);
      if (evaluation.approved) {
        markVerified();
        markIssued({
          tokenId: evaluation.aToken?.tokenId ?? "—",
          txRef: evaluation.settlement?.txRef ?? "0x",
        });
      }
    } catch (error) {
      console.error("[MachineTrust] issuance failed", error);
      setResult(null);
      setChecks([]);
    } finally {
      runningRef.current = false;
      setState("done");
      window.dispatchEvent(new CustomEvent("mt:issuance-done"));
    }
  }, [issuerCredential, asset, setAToken, recordDecision, markVerified, markIssued]);

  // Guided demo runner — stable listener.
  useEffect(() => {
    function onDemo() {
      void run();
    }
    window.addEventListener("mt:issuance", onDemo);
    return () => window.removeEventListener("mt:issuance", onDemo);
  }, [run]);

  return (
    <Section id="issuance" label="RWA issuance" className="scroll-mt-16">
      <Shell>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <Eyebrow index="08">RWA issuance</Eyebrow>
            <Heading>Issue the machine as a compliant asset.</Heading>
            <p className="mt-3 flex items-center gap-2 text-muted-foreground">
              <CleanverseMark className="size-3.5 text-foreground" />
              <span className="mt-mono text-[10px] uppercase tracking-[0.18em]">
                Cleanverse gates before value moves
              </span>
            </p>
            <Lede>
              Issuance starts with the Cleanverse Trust Framework: issuer CVI / A-Pass, CVA /
              A-Token bind, then CCP Programmed Governance before value moves. RWA ISSUED only
              appears when those gates actually pass.
            </Lede>
            <div className="mt-4 flex flex-wrap gap-2">
              <IntegrationModeTag mode={mode === "live" ? "sandbox" : "demo"} />
              <DemoTag />
            </div>
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
            <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
              CVA: Sandbox binds the registered Monad aUSDC A-Token for CCP. Custom{" "}
              <code>/atoken/launch</code> currently returns <code>ISSUE_FAILED</code> on Monad UAT —
              that limitation is exposed, never fabricated as ISSUED.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="border border-border bg-surface/50 p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <p className="mt-mono text-[11px] uppercase tracking-[0.16em]">Issuance sequence</p>
                <span className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {state === "idle" ? "Ready" : state === "running" ? "Verifying" : "Complete"} ·{" "}
                  {mode}
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

              <div className="mt-px grid grid-cols-1 gap-px bg-border">
                <div className="bg-background px-4 py-4">
                  <p className="mt-label">A-Token · CVA</p>
                  <p className="mt-mono mt-1.5 break-all text-[12px]">{aToken.tokenId}</p>
                  <p
                    className={`mt-mono mt-1 text-[11px] uppercase tracking-[0.18em] ${
                      aToken.status === "unissued" ? "text-muted-foreground" : "text-success"
                    }`}
                  >
                    {aToken.status === "bound" ? "BOUND · registered aUSDC" : aToken.status}
                    {aToken.contractAddress
                      ? ` · ${aToken.contractAddress.slice(0, 10)}…`
                      : aToken.mintedAt
                        ? ` · ${aToken.mintedAt.slice(0, 16).replace("T", " ")}`
                        : ""}
                  </p>
                </div>
              </div>

              <PipelineStages kind="issuance" active={stage} />

              <div className="mt-7">
                <CheckSequence
                  checks={checks.length ? checks : preview}
                  revealed={revealed}
                  state={state}
                />
              </div>

              <AnimatePresence>
                {state === "done" && result ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-6 space-y-4"
                  >
                    <VerdictBanner result={result} />
                    {result.approved ? (
                      <p className="mt-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                        RWA ISSUED · CVI + CVA bound + CCP
                        {result.degraded ? " · DEGRADED" : ""}
                      </p>
                    ) : null}
                    {result.notice ? (
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {result.notice}
                      </p>
                    ) : null}
                    <TraceStrip result={result} />
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
