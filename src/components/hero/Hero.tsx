import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { Shell, DemoTag } from "@/components/primitives";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { EASE } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useMotionPrefs";
import { MachineTwin } from "./MachineTwin";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE.expoOut },
});

/** The five continuous states of the hero transformation. */
const STAGES = [
  { at: 0.0, key: "physical", label: "Physical machine", note: "Serial IRB6700-92831" },
  { at: 0.2, key: "wireframe", label: "Technical scan", note: "Geometry → wireframe" },
  { at: 0.4, key: "metadata", label: "Machine metadata", note: "Identity record forming" },
  { at: 0.6, key: "components", label: "Component identity", note: "Parts resolved" },
  { at: 0.8, key: "asset", label: "Verified asset", note: "MACHINE 042" },
] as const;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** Continuous 0→1 ramp across a scroll window — no state ever cuts. */
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const LABELS = [
  { key: "controller", name: "Controller", id: "IRC5-3HAC-0421", pos: "left-[46%] bottom-[14%]" },
  { key: "motor", name: "Axis motor", id: "AXS-M2-77140", pos: "left-[38%] top-[22%]" },
  { key: "arm", name: "Arm assembly", id: "IRB6700-ARM-8802", pos: "left-[60%] top-[10%]" },
  { key: "safety", name: "Safety envelope", id: "SAF-ENV-1180", pos: "left-[52%] bottom-[32%]" },
];

export function Hero() {
  const track = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [p, setP] = useState(0);

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(v));

  const phase = reduced ? 1 : p;
  const beam = phase > 0.18 && phase < 0.46 ? 1 - ramp(phase, 0.18, 0.46) : null;
  const explode = ramp(phase, 0.52, 0.72) * (1 - ramp(phase, 0.82, 0.95));
  const stageIndex = STAGES.reduce((acc, s, i) => (phase >= s.at ? i : acc), 0);

  const introOut = ramp(phase, 0.12, 0.3);
  const secondIn = ramp(phase, 0.24, 0.42);
  const secondOut = ramp(phase, 0.66, 0.82);
  const verified = ramp(phase, 0.78, 0.94);

  return (
    <section
      ref={track}
      id="hero"
      className="relative h-[420svh]"
      aria-label="Machine Trust introduction"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div
          className="mt-grid-bg pointer-events-none absolute inset-0 -z-10 opacity-40"
          aria-hidden="true"
        />

        {/* the machine is the stage — it never leaves during the transformation */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${1 + phase * 0.08})`,
            opacity: 1 - ramp(phase, 0.94, 1) * 0.35,
          }}
        >
          <div className="h-full w-full max-w-[1600px]" data-cursor="inspect">
            <MachineTwin phase={phase} explode={explode} beam={beam} bare />
          </div>
        </div>

        <Shell className="relative flex h-full flex-col justify-center">
          {/* headline choreography: one line replaces the other in the same slot */}
          <div className="relative w-full" style={{ maxWidth: "min(560px, 90vw)" }}>
            <div style={{ opacity: 1 - introOut }}>
              <motion.div {...rise(0.15)} className="mb-8 flex flex-wrap items-center gap-3">
                <span className="mt-mono border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  RWA · Machine infrastructure
                </span>
                <DemoTag />
              </motion.div>
            </div>

            <div className="relative grid max-w-[9ch] text-[length:var(--text-hero)] font-medium leading-[0.95] tracking-[-0.04em] [&>*]:col-start-1 [&>*]:row-start-1">
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
                Trust the machine.
              </motion.span>

              <span
                className="block text-muted-foreground"
                style={{
                  opacity: secondIn * (1 - secondOut),
                  transform: `translateY(${(1 - secondIn) * 46 - secondOut * 34}%)`,
                  filter: `blur(${(1 - secondIn) * 10 + secondOut * 8}px)`,
                }}
              >
                Program the asset.
              </span>
            </div>

            <div style={{ opacity: 1 - introOut, pointerEvents: introOut > 0.6 ? "none" : "auto" }}>
              <motion.p
                {...rise(0.56)}
                className="mt-6 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground"
              >
                Machine Trust connects physical machine identity, provenance and ownership with
                compliance-aware on-chain transactions.
              </motion.p>

              <motion.div {...rise(0.68)} className="mt-7 flex flex-wrap items-center gap-3">
                <MagneticButton href="#passport" cursor="open">
                  Explore Machine
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </MagneticButton>
                <MagneticButton href="#architecture" variant="outline">
                  View Architecture
                </MagneticButton>
              </motion.div>
            </div>
          </div>

          {/* technical annotations resolve as the scan passes each component */}
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

          {/* the machine's identity record materialises on the right */}
          <div
            className="pointer-events-none absolute right-6 top-1/2 hidden w-[260px] -translate-y-1/2 md:block xl:right-10"
            style={{ opacity: ramp(phase, 0.38, 0.52) }}
          >
            <p className="mt-label">Machine record</p>
            <dl className="mt-3 divide-y divide-border border border-border bg-background/60 backdrop-blur-sm">
              {[
                ["Index", "MACHINE 042"],
                ["Model", "ABB IRB 6700"],
                ["Serial", "IRB6700-92831"],
                ["Commissioned", "2025-03-11"],
                ["Provenance", "17 events"],
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

          {/* final state: the machine is now a verified asset */}
          <AnimatePresence>
            {verified > 0.02 ? (
              <motion.div
                key="verified"
                initial={{ opacity: 0 }}
                animate={{ opacity: verified }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center gap-4 text-center md:bottom-28"
                style={{ transform: `translateY(${(1 - verified) * 24}px)` }}
              >
                <span className="mt-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  Machine 042
                </span>
                <span className="text-[clamp(2rem,5vw,3.6rem)] font-medium leading-none tracking-[-0.03em]">
                  Verified asset
                </span>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                  {["Identity", "Provenance", "Compliance"].map((k, i) => (
                    <span
                      key={k}
                      className="mt-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary"
                      style={{ opacity: ramp(phase, 0.84 + i * 0.03, 0.9 + i * 0.03) }}
                    >
                      {k} <span aria-hidden="true">✓</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* stage rail — the transformation index */}
          <div className="absolute inset-x-0 bottom-6 md:bottom-8">
            <div className="flex items-center justify-between gap-4">
              <div className="mt-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
                {STAGES[stageIndex]?.label}
                <span className="ml-3 text-primary">{STAGES[stageIndex]?.note}</span>
              </div>
              <div className="mt-mono text-[9px] tabular-nums text-muted-foreground">
                {String(Math.round(phase * 100)).padStart(3, "0")}%
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              {STAGES.map((s, i) => (
                <div key={s.key} className="h-px flex-1 bg-border">
                  <div
                    className="h-px bg-primary"
                    style={{ width: `${ramp(phase, s.at, STAGES[i + 1]?.at ?? 1) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Shell>
      </div>
    </section>
  );
}
