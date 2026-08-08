import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { machineParts } from "@/data/demoMachine";
import { useFinePointer, useHydrated, useReducedMotion } from "@/hooks/useMotionPrefs";
import { EASE } from "@/lib/motion";
import { MachinePlate } from "./MachinePlate";
import type { RegionKey } from "./MachineScene";

// WebGL is loaded only after hydration, and only where it is worth the cost.
const MachineScene = lazy(() => import("./MachineScene"));

const REGION_LABEL: Record<RegionKey, string> = {
  controller: "Controller / base",
  motor: "Axis motor",
  arm: "Arm assembly",
  safety: "Safety envelope",
};

/**
 * The hero's living machine: a real-time 3D twin that dematerialises into a
 * programmable asset as you scroll, with inspectable components.
 * Falls back to the technical SVG plate on small screens, reduced motion, or
 * when WebGL is unavailable.
 */
export function MachineTwin() {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const fine = useFinePointer();
  const wrap = useRef<HTMLDivElement>(null);

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [wide, setWide] = useState(false);
  const [hovered, setHovered] = useState<RegionKey | null>(null);
  const [selected, setSelected] = useState<RegionKey | null>(null);
  const [phase, setPhase] = useState(0);

  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end start"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => setPhase(Math.min(1, v * 1.4)));

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") ?? c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    const mq = window.matchMedia("(min-width: 768px)");
    const set = () => setWide(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const use3d = hydrated && !reduced && wide && webgl === true;
  const focus = selected ?? hovered;
  const part = focus ? machineParts.find((p) => p.key === focus) : undefined;

  return (
    <div ref={wrap} className="relative">
      <div className="relative aspect-[4/5] w-full min-w-0 border border-border bg-card/40 sm:aspect-square">
        {/* corner registration marks */}
        {["left-0 top-0", "right-0 top-0", "left-0 bottom-0", "right-0 bottom-0"].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`absolute ${pos} size-3 border-primary/60 [border-left-width:1px] [border-top-width:1px]`}
          />
        ))}

        {use3d ? (
          <Suspense fallback={null}>
            <MachineScene
              phase={phase}
              hovered={hovered}
              selected={selected}
              onHover={setHovered}
              onSelect={setSelected}
            />
          </Suspense>
        ) : (
          <div className="absolute inset-0 p-4">
            <MachinePlate />
          </div>
        )}

        {/* live telemetry HUD */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="mt-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            ABB IRB 6700 · digital twin
          </span>
          <span className="mt-mono flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-primary">
            <motion.span
              className="inline-block size-1.5 rounded-full bg-primary"
              animate={{ opacity: reduced ? 1 : [1, 0.25, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            Live
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
          <AnimatePresence mode="wait">
            {part ? (
              <motion.div
                key={part.key}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{ duration: 0.32, ease: EASE.expoOut }}
                className="border border-primary/40 bg-background/85 px-3 py-2 backdrop-blur-sm"
              >
                <p className="mt-mono text-[9px] uppercase tracking-[0.22em] text-primary">
                  {REGION_LABEL[part.key as RegionKey]}
                </p>
                <p className="mt-1 text-[12px] text-foreground">{part.partId}</p>
                <p className="mt-mono mt-0.5 text-[10px] text-muted-foreground">
                  {part.maintenance}
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground"
              >
                {use3d
                  ? fine
                    ? "Hover components · click to isolate"
                    : "Tap components to inspect"
                  : "Technical plate view"}
              </motion.p>
            )}
          </AnimatePresence>

          <span className="mt-mono shrink-0 text-[9px] tabular-nums text-muted-foreground">
            TOKENIZATION {Math.round(phase * 100)}%
          </span>
        </div>
      </div>

      <div className="mt-3 h-px w-full bg-border" aria-hidden="true">
        <div
          className="h-px bg-primary transition-[width] duration-200"
          style={{ width: `${Math.round(phase * 100)}%` }}
        />
      </div>
    </div>
  );
}