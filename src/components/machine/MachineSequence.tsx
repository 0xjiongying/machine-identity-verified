import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Shell } from "@/components/primitives";
import { machineComponents, type ComponentKey } from "@/data/machineComponents";
import { useFinePointer, useHydrated, useReducedMotion } from "@/hooks/useMotionPrefs";
import { EASE } from "@/lib/motion";
import { usePerf } from "@/lib/perf";
import { play } from "@/lib/sound";

const SequenceScene = lazy(() => import("./SequenceScene"));

const STAGES = [
  { at: 0.0, label: "Coiled", note: "Dormant / stowed configuration" },
  { at: 0.14, label: "Unfolding", note: "Joints extending under load" },
  { at: 0.5, label: "Activating", note: "Power-up / scan pass" },
  { at: 0.62, label: "Operating", note: "Continuous work cycle" },
  { at: 0.9, label: "Recoiling", note: "Return to stowed state" },
] as const;

/**
 * The interactive machine band: a fully rendered 3D industrial arm that runs a
 * coil → activate → move → recoil sequence driven by scroll, with drag-to-orbit
 * and clickable components. No footage anywhere — everything is real-time.
 */
export function MachineSequence() {
  const track = useRef<HTMLElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const { tier } = usePerf();

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [p, setP] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hovered, setHovered] = useState<ComponentKey | null>(null);
  const [selected, setSelected] = useState<ComponentKey | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setP(v);
    setAuto(false);
    if (idle.current) clearTimeout(idle.current);
    // After the user stops scrolling the machine keeps working on its own loop.
    idle.current = setTimeout(() => setAuto(true), 2600);
  });

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") ?? c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    return () => {
      if (idle.current) clearTimeout(idle.current);
    };
  }, []);

  const stage = STAGES.reduce((acc, s, i) => (p >= s.at ? i : acc), 0);
  const focus = selected ?? hovered;
  const part = focus ? machineComponents.find((c) => c.key === focus) : undefined;
  const use3d = hydrated && webgl === true;

  return (
    <section
      ref={track}
      id="machine-sequence"
      aria-label="Interactive machine model"
      className="relative h-[300svh]"
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="absolute inset-0">
          {use3d ? (
            <Suspense fallback={null}>
              <SequenceScene
                progress={reduced ? 0.7 : p}
                auto={reduced ? false : auto}
                tier={tier}
                hovered={hovered}
                selected={selected}
                onHover={(k) => {
                  if (k && k !== hovered) play("inspect");
                  setHovered(k);
                }}
                onSelect={setSelected}
              />
            </Suspense>
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_10%,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_70%)]"
            />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

        <Shell className="pointer-events-none relative flex h-full flex-col justify-between pt-28 pb-12">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="mt-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                Interactive machine model
              </p>
              <p className="mt-mono mt-2 flex items-center gap-2 text-[10px] tracking-[0.24em] text-primary uppercase">
                <span className="size-1.5 rounded-full bg-primary" />
                {fine ? "Drag to inspect" : "Drag / tap to inspect"}
              </p>
            </div>
            <div className="text-right">
              <p className="mt-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                {STAGES[stage]?.label}
              </p>
              <p className="mt-mono mt-1 text-[10px] text-primary">{STAGES[stage]?.note}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              {part ? (
                <motion.div
                  key={part.key}
                  initial={{ opacity: 0, y: 12, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(5px)" }}
                  transition={{ duration: 0.34, ease: EASE.expoOut }}
                  className="max-w-[360px] border border-primary/40 bg-background/85 p-4 backdrop-blur-sm"
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
                  className="mt-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase"
                >
                  Motor · arm · controller · safety system — select a component
                </motion.p>
              )}
            </AnimatePresence>

            <div>
              <div className="flex items-center justify-between">
                <span className="mt-mono text-[9px] tracking-[0.24em] text-muted-foreground uppercase">
                  Sequence
                </span>
                <span className="mt-mono text-[9px] tabular-nums text-muted-foreground">
                  {String(Math.round(p * 100)).padStart(3, "0")}%
                </span>
              </div>
              <div className="mt-2 flex gap-1.5">
                {STAGES.map((s, i) => (
                  <div key={s.label} className="h-px flex-1 bg-border">
                    <div
                      className="h-px bg-primary transition-[width] duration-150"
                      style={{
                        width: `${Math.min(1, Math.max(0, (p - s.at) / ((STAGES[i + 1]?.at ?? 1) - s.at))) * 100}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Shell>
      </div>
    </section>
  );
}