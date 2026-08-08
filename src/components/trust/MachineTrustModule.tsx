import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Shell } from "@/components/primitives";
import {
  dataCards,
  machineIdentity,
  moduleParts,
  onChain,
  verifySteps,
  type ModuleKey,
} from "@/data/trustModule";
import { useFinePointer, useHydrated, useReducedMotion } from "@/hooks/useMotionPrefs";
import { EASE } from "@/lib/motion";
import { usePerf } from "@/lib/perf";
import { play } from "@/lib/sound";

const TrustModuleScene = lazy(() => import("./TrustModuleScene"));

/** Scroll thresholds for the signature COMPACT → READY sequence. */
const STEP_AT = [0, 0.1, 0.2, 0.32, 0.44, 0.55, 0.66, 0.78, 0.9];

const CARD_SIDE: Record<string, "left" | "right"> = {
  passport: "left",
  cva: "left",
  cvi: "right",
  ccp: "right",
};

/**
 * Hero band: the Machine Asset Core — motor, controller, arm and safety
 * chip, holographic data cards and a purple verification laser that anchors the
 * machine's identity on-chain. Everything is real-time 3D; no footage.
 */
export function MachineTrustModule() {
  const track = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const { tier } = usePerf();

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [p, setP] = useState(0);
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState<ModuleKey | null>(null);
  const [selected, setSelected] = useState<ModuleKey | null>(null);

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setP(v));

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") ?? c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
  }, []);

  // Stop rendering the canvas while the band is off-screen (big mobile win).
  useEffect(() => {
    const el = track.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), {
      rootMargin: "10% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const step = STEP_AT.reduce((acc, at, i) => (p >= at ? i : acc), 0);
  const verified = step >= verifySteps.length - 1;
  const part =
    (selected ?? hovered) ? moduleParts.find((m) => m.key === (selected ?? hovered)) : undefined;
  const use3d = hydrated && webgl === true;
  const activeTarget = verifySteps[step]?.target;

  useEffect(() => {
    if (step > 0) play("inspect");
  }, [step]);

  return (
    <section
      ref={track}
      id="machine-sequence"
      aria-label="Interactive Machine Asset Core"
      className="relative h-[320svh]"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="absolute inset-0">
          {use3d ? (
            <Suspense fallback={null}>
              <TrustModuleScene
                hideCards
                progress={reduced ? 0.85 : p}
                step={reduced ? verifySteps.length - 1 : step}
                tier={tier}
                coarse={!fine}
                reducedMotion={reduced}
                paused={!visible}
                hovered={hovered}
                selected={selected}
                onHover={(k) => {
                  if (k && k !== hovered) play("inspect");
                  setHovered(k);
                }}
                onSelect={(k) => {
                  if (k) play("inspect");
                  setSelected(k);
                }}
              />
            </Suspense>
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_70%)]"
            />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <Shell className="pointer-events-none relative flex h-full flex-col justify-between pt-28 pb-12">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="mt-mono text-[10px] leading-[1.5] tracking-[0.24em] text-muted-foreground uppercase">
                Interactive
                <br />
                Machine asset core
              </p>
              <p className="mt-mono mt-3 flex items-center gap-2 text-[10px] tracking-[0.24em] text-primary uppercase">
                <span className="size-1.5 rounded-full bg-primary" />
                {fine ? "Drag to inspect" : "Drag / tap to inspect"}
              </p>
            </div>
            <div className="text-right">
              <p className="mt-mono text-[10px] leading-[1.5] tracking-[0.24em] text-muted-foreground uppercase">
                On-chain
                <br />
                Machine identity
              </p>
              <p className="mt-3 mt-mono text-[10px] tracking-[0.24em] text-primary uppercase">
                {verifySteps[step]?.label}
                {verified ? " ✓" : "…"}
              </p>
              <p className="mt-mono mt-1 text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                {verifySteps[step]?.owner}
              </p>
            </div>
          </div>

          {/* holographic data cards, laser-synced */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
            <Shell className="flex items-center justify-between gap-4">
              {(["left", "right"] as const).map((side) => (
                <div key={side} className="flex w-[168px] flex-col gap-3">
                  {dataCards
                    .filter((c) => CARD_SIDE[c.key] === side)
                    .map((c) => {
                      const on = activeTarget === c.key || (verified && step >= c.at);
                      return (
                        <motion.div
                          key={c.key}
                          animate={{
                            opacity: on ? 1 : 0.55,
                            x: on ? (side === "left" ? 10 : -10) : 0,
                            borderColor: on
                              ? "color-mix(in oklab, var(--color-primary) 70%, transparent)"
                              : "var(--color-border)",
                          }}
                          transition={{ duration: 0.5, ease: EASE.expoOut }}
                          className="border bg-background/60 p-3 backdrop-blur-md"
                        >
                          <p className="mt-mono text-[8px] tracking-[0.22em] text-muted-foreground uppercase">
                            {c.label}
                          </p>
                          <p className="mt-1 text-[15px] text-foreground">
                            {step >= c.at ? c.live.value : c.pending.value}
                          </p>
                          <p
                            className={`mt-mono mt-1 text-[8px] tracking-[0.2em] uppercase ${
                              step >= c.at ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {step >= c.at ? c.live.state : c.pending.state}
                          </p>
                        </motion.div>
                      );
                    })}
                </div>
              ))}
            </Shell>
          </div>

          <div className="flex items-end justify-between gap-6">
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="wait">
                {part ? (
                  <motion.div
                    key={part.key}
                    initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(5px)" }}
                    transition={{ duration: 0.34, ease: EASE.expoOut }}
                    className="max-w-[340px] border border-primary/40 bg-background/85 p-4 backdrop-blur-sm"
                  >
                    <p className="mt-mono text-[9px] tracking-[0.22em] text-primary uppercase">
                      {part.index} · {part.name}
                    </p>
                    <p className="mt-1 text-[13px] text-foreground">{part.partId}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                      {part.summary}
                    </p>
                    <dl className="mt-3 divide-y divide-border border-t border-border">
                      {part.specs.map((s) => (
                        <div key={s.label} className="flex justify-between gap-4 py-1.5">
                          <dt className="mt-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                            {s.label}
                          </dt>
                          <dd className="mt-mono text-[10px] text-foreground">{s.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </motion.div>
                ) : (
                  <motion.p
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-mono max-w-[320px] text-[9px] leading-[1.8] tracking-[0.2em] text-muted-foreground uppercase"
                  >
                    Motor · controller · arm · safety system — select a module to lock the scanner
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="w-[min(420px,60vw)]">
                <div className="flex items-center justify-between">
                  <span className="mt-mono text-[9px] tracking-[0.24em] text-muted-foreground uppercase">
                    RWA lifecycle
                  </span>
                  <span className="mt-mono text-[9px] tabular-nums text-muted-foreground">
                    {String(Math.round(p * 100)).padStart(3, "0")}%
                  </span>
                </div>
                <p className="mt-mono mt-2 max-w-[46ch] text-[9px] leading-[1.7] tracking-[0.16em] text-muted-foreground uppercase">
                  {verifySteps[step]?.detail}
                </p>
                <div className="mt-2 flex gap-1.5">
                  {verifySteps.map((s, i) => (
                    <div key={s.id} className="h-px flex-1 bg-border">
                      <div
                        className="h-px bg-primary transition-[width] duration-150"
                        style={{
                          width: `${Math.min(1, Math.max(0, (p - (STEP_AT[i] ?? 0)) / ((STEP_AT[i + 1] ?? 1) - (STEP_AT[i] ?? 0)))) * 100}%`,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* on-chain infrastructure readout */}
            <AnimatePresence>
              {selected === "controller" ? (
                <motion.div
                  key="identity"
                  initial={{
                    opacity: 0,
                    y: 18,
                    clipPath: "inset(0 0 100% 0)",
                    filter: "blur(6px)",
                  }}
                  animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 12, clipPath: "inset(0 0 100% 0)", filter: "blur(6px)" }}
                  transition={{ duration: 0.6, ease: EASE.expoOut }}
                  className="pointer-events-auto hidden w-[300px] border border-primary/60 bg-primary/[0.06] p-4 backdrop-blur-md md:block"
                >
                  <p className="mt-mono flex items-center gap-2 text-[9px] tracking-[0.24em] text-primary uppercase">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                    {machineIdentity.title}
                  </p>
                  <p className="mt-2 text-[22px] leading-none tracking-tight text-foreground">
                    {machineIdentity.id}
                  </p>
                  <p className="mt-mono mt-1 text-[9px] break-all text-primary/80">
                    {machineIdentity.did}
                  </p>
                  <dl className="mt-3 divide-y divide-border border-t border-border">
                    {machineIdentity.fields.map((f, i) => (
                      <motion.div
                        key={f.label}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.12 + i * 0.05, duration: 0.4, ease: EASE.expoOut }}
                        className="flex justify-between gap-4 py-1.5"
                      >
                        <dt className="mt-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                          {f.label}
                        </dt>
                        <dd className="mt-mono text-[10px] text-foreground">{f.value}</dd>
                      </motion.div>
                    ))}
                  </dl>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="mt-mono mt-3 text-[9px] tracking-[0.22em] text-muted-foreground uppercase transition-colors hover:text-primary"
                  >
                    Release lock ×
                  </button>
                </motion.div>
              ) : verified ? (
                <motion.div
                  key="onchain"
                  initial={{ opacity: 0, y: 18, clipPath: "inset(100% 0 0 0)" }}
                  animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.7, ease: EASE.expoOut }}
                  className="hidden w-[300px] border border-primary/50 bg-background/85 p-4 backdrop-blur-md md:block"
                >
                  <p className="mt-mono text-[9px] tracking-[0.24em] text-primary uppercase">
                    ✓ {onChain.title}
                  </p>
                  <p className="mt-2 text-[22px] leading-none tracking-tight text-foreground">
                    {onChain.id}
                  </p>
                  <dl className="mt-3 divide-y divide-border border-t border-border">
                    {[
                      ["Network", onChain.network],
                      ["Contract", onChain.contract],
                      ["Address", onChain.address],
                      ["Records", onChain.records],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 py-1.5">
                        <dt className="mt-mono text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                          {k}
                        </dt>
                        <dd className="mt-mono text-[10px] text-foreground">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </Shell>
      </div>
    </section>
  );
}
