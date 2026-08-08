import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { Shell, DemoTag } from "@/components/primitives";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { EASE } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useMotionPrefs";
import { MachineTwin } from "./MachineTwin";
import { useLending } from "@/lib/lending-state";
import { cn } from "@/lib/utils";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE.expoOut },
});

const STAGES = [
  { at: 0.0, key: "physical", label: "Physical machine", note: "Serial IRB6700-92831" },
  { at: 0.2, key: "wireframe", label: "Technical scan", note: "Geometry → wireframe" },
  { at: 0.4, key: "identity", label: "Owner identity", note: "CVI / A-Pass gate" },
  { at: 0.6, key: "eligible", label: "Eligible borrower", note: "Compliance approved" },
  { at: 0.8, key: "finance", label: "Financing available", note: "Machine Finance Pool" },
] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const LABELS = [
  { key: "chip", name: "Trust chip", id: "MT-SE-2048", pos: "left-[52%] top-[30%]" },
  { key: "board", name: "Verification board", id: "MT-VB-118", pos: "left-[38%] bottom-[26%]" },
  { key: "enclosure", name: "Tamper enclosure", id: "MT-ENC-04", pos: "left-[64%] top-[16%]" },
  { key: "mechanics", name: "Mount & interlocks", id: "MT-MNT-09", pos: "left-[46%] bottom-[12%]" },
];

export function Hero() {
  const track = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [p, setP] = useState(0);
  const { financingVisual, eligibility } = useLending();

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(v));

  const phase = reduced ? 1 : p;
  const beam = phase > 0.18 && phase < 0.46 ? 1 - ramp(phase, 0.18, 0.46) : null;
  const explode = ramp(phase, 0.52, 0.72) * (1 - ramp(phase, 0.82, 0.95));
  const stageIndex = STAGES.reduce((acc, s, i) => (phase >= s.at ? i : acc), 0);

  const introOut = ramp(phase, 0.12, 0.3);
  const secondIn = ramp(phase, 0.24, 0.42);
  const secondOut = ramp(phase, 0.66, 0.82);
  const finale = ramp(phase, 0.78, 0.94);

  const locked = financingVisual === "restricted";

  return (
    <section
      ref={track}
      id="hero"
      className="relative h-[420svh]"
      aria-label="Machine Trust Compliant DeFi introduction"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div
          className="mt-grid-bg pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${1 + phase * 0.08})`,
            opacity: 1 - ramp(phase, 0.94, 1) * 0.35,
            filter: locked && finale > 0.2 ? "saturate(0.55)" : undefined,
          }}
        >
          <div className="h-full w-full max-w-[1600px]" data-cursor="inspect">
            <MachineTwin phase={phase} explode={explode * 0.5} beam={beam} bare />
          </div>
        </div>

        {/* financing visual state */}
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4">
          <span
            className={cn(
              "mt-mono border px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] backdrop-blur-sm",
              financingVisual === "restricted" && "border-destructive/40 text-destructive",
              financingVisual === "enabled" && "border-primary/40 text-primary",
              financingVisual === "active" && "border-success/40 text-success",
              financingVisual === "closed" && "border-border text-muted-foreground",
            )}
          >
            {financingVisual === "restricted" && "Financing restricted"}
            {financingVisual === "enabled" && "Financing enabled"}
            {financingVisual === "active" && "Loan active"}
            {financingVisual === "closed" && "Loan closed"}
            {eligibility?.layers.cvi === "VERIFIED" ? " · CVI verified" : ""}
          </span>
        </div>

        <Shell className="relative flex h-full flex-col justify-center">
          <div className="relative w-full" style={{ maxWidth: "min(620px, 90vw)" }}>
            <div style={{ opacity: 1 - introOut }}>
              <motion.div {...rise(0.15)} className="mb-8 flex flex-wrap items-center gap-3">
                <span className="mt-mono border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Interactive machine finance
                </span>
                <DemoTag />
              </motion.div>
            </div>

            <div className="relative grid max-w-[14ch] text-[length:var(--text-hero)] font-medium leading-[0.95] tracking-[-0.04em] [&>*]:col-start-1 [&>*]:row-start-1">
              <motion.span
                className="block"
                style={{
                  opacity: 1 - introOut,
                  y: `${-introOut * 40}%`,
                  filter: `blur(${introOut * 10}px)`,
                  clipPath: `inset(0 0 ${introOut * 100}% 0)`,
                }}
                initial={{ opacity: 0, y: 60, filter: "blur(12px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1.2, delay: 0.25, ease: EASE.expoOut }}
              >
                Finance machines.
              </motion.span>

              <span
                className="block text-muted-foreground"
                style={{
                  opacity: secondIn * (1 - secondOut),
                  transform: `translateY(${(1 - secondIn) * 46 - secondOut * 34}%)`,
                  filter: `blur(${(1 - secondIn) * 10 + secondOut * 8}px)`,
                }}
              >
                Verify the borrower.
              </span>
            </div>

            <div style={{ opacity: 1 - introOut, pointerEvents: introOut > 0.6 ? "none" : "auto" }}>
              <motion.p
                {...rise(0.56)}
                className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground"
              >
                Verified identity unlocks compliant machine finance. A CVI-gated DeFi market for
                verified borrowers — Cleanverse decides access, Monad executes the loan.
              </motion.p>

              <motion.div {...rise(0.68)} className="mt-7 flex flex-wrap items-center gap-3">
                <MagneticButton href="#finance" cursor="open">
                  Check Eligibility
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </MagneticButton>
                <MagneticButton href="#inspect" variant="outline">
                  Explore Machine
                </MagneticButton>
              </motion.div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
            {LABELS.map((l, i) => {
              const a =
                ramp(phase, 0.56 + i * 0.04, 0.66 + i * 0.04) * (1 - ramp(phase, 0.84, 0.92));
              return (
                <div
                  key={l.key}
                  className={`absolute ${l.pos} flex items-center gap-2`}
                  style={{ opacity: a, transform: `translateX(${(1 - a) * -12}px)` }}
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="h-px w-10 bg-primary/50" />
                  <span className="border border-primary/30 bg-background/70 px-2 py-1 backdrop-blur-sm">
                    <span className="mt-mono block text-[9px] uppercase tracking-[0.22em] text-primary">
                      {l.name}
                    </span>
                    <span className="mt-mono block text-[10px] text-muted-foreground">{l.id}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute right-6 top-1/2 hidden w-[260px] -translate-y-1/2 md:block xl:right-10"
            style={{ opacity: ramp(phase, 0.38, 0.52) }}
          >
            <p className="mt-label">Finance path</p>
            <dl className="mt-3 divide-y divide-border border border-border bg-background/60 backdrop-blur-sm">
              {[
                ["Machine", "ABB IRB 6700"],
                ["Passport", "MT-000042"],
                ["Gate", "CVI / A-Pass"],
                ["Market", "USDC pool"],
                ["Settlement", "Monad"],
              ].map(([k, v], i) => (
                <div
                  key={k}
                  className="flex items-center justify-between gap-4 px-3 py-2"
                  style={{ opacity: ramp(phase, 0.4 + i * 0.02, 0.48 + i * 0.02) }}
                >
                  <dt className="mt-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    {k}
                  </dt>
                  <dd className="mt-mono text-[11px] text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <AnimatePresence>
            {finale > 0.02 ? (
              <motion.div
                key="finale"
                initial={{ opacity: 0 }}
                animate={{ opacity: finale }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center gap-4 text-center md:bottom-28"
                style={{ transform: `translateY(${(1 - finale) * 24}px)` }}
              >
                <span className="mt-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Machine finance
                </span>
                <span className="text-[clamp(1.8rem,4.5vw,3.2rem)] font-medium leading-none tracking-[-0.03em]">
                  {locked ? "Access gated by identity" : "Compliant credit unlocked"}
                </span>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {["Machine", "Verified owner", "Eligible borrower", "Financing"].map((k, i) => (
                    <span
                      key={k}
                      className="mt-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary"
                      style={{ opacity: ramp(phase, 0.84 + i * 0.03, 0.9 + i * 0.03) }}
                    >
                      {k} <span aria-hidden="true">→</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-x-0 bottom-6">
            <ol className="mx-auto flex max-w-[720px] flex-wrap justify-center gap-2 px-4">
              {STAGES.map((s, i) => (
                <li
                  key={s.key}
                  className={cn(
                    "mt-mono border px-2 py-1 text-[9px] uppercase tracking-[0.16em]",
                    i === stageIndex
                      ? "border-primary/50 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
        </Shell>
      </div>
    </section>
  );
}
