import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { moduleParts, type ModuleKey } from "@/data/trustModule";
import { useFinePointer, useHydrated, useReducedMotion } from "@/hooks/useMotionPrefs";
import { EASE } from "@/lib/motion";
import { usePerf } from "@/lib/perf";
import { play } from "@/lib/sound";
import { isBootComplete, onBootComplete } from "@/lib/boot-state";

// WebGL is loaded only after hydration, and only where it is worth the cost.
const TrustModuleScene = lazy(() => import("@/components/trust/TrustModuleScene"));

/**
 * The hero's living object: the Machine Asset Core — a modular industrial
 * hardware enclosure around a cryptographic trust chip. It opens, activates and
 * is laser-verified as you scroll, and stays inspectable throughout.
 */
type TwinProps = {
  /** 0 → sealed hardware, 1 → verified on-chain asset. Driven by the hero scroll. */
  phase?: number;
  explode?: number;
  beam?: number | null;
  /** Hide the framed chrome when the module is used as a full-bleed stage. */
  bare?: boolean;
};

export function MachineTwin({ phase = 0, explode = 0, bare = false }: TwinProps) {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const fine = useFinePointer();

  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [wide, setWide] = useState(false);
  const [hovered, setHovered] = useState<ModuleKey | null>(null);
  const [selected, setSelected] = useState<ModuleKey | null>(null);
  const [booted, setBooted] = useState(false);
  const { tier } = usePerf();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBootComplete()) setBooted(true);
    return onBootComplete(() => setBooted(true));
  }, []);

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

  const use3d = hydrated && booted && !reduced && wide && webgl === true;
  const part =
    (selected ?? hovered) ? moduleParts.find((p) => p.key === (selected ?? hovered)) : undefined;

  // scroll phase → verification step (scan → identity → provenance → parts → maintenance → chain)
  const step = Math.min(5, Math.floor(phase * 6));

  return (
    <div ref={wrap} className={bare ? "relative h-full w-full" : "relative"}>
      <div
        className={
          bare
            ? "relative h-full w-full min-w-0"
            : "relative aspect-[4/5] w-full min-w-0 border border-border bg-card/40 sm:aspect-square"
        }
      >
        {use3d ? (
          <Suspense fallback={null}>
            <TrustModuleScene
              progress={phase}
              step={step}
              hideCards
              scale={0.54}
              offsetX={0.15}
              explode={explode}
              tier={tier}
              coarse={!fine}
              reducedMotion={reduced}
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
            className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_20%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_70%)]"
          />
        )}

        {use3d ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <AnimatePresence mode="wait">
              {part ? (
                <motion.div
                  key={part.key}
                  initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                  transition={{ duration: 0.32, ease: EASE.expoOut }}
                  className="border border-primary/40 bg-background/85 px-4 py-2 backdrop-blur-sm"
                >
                  <span className="mt-mono text-[9px] tracking-[0.22em] text-primary uppercase">
                    {part.index} · {part.name} — {part.partId}
                  </span>
                </motion.div>
              ) : (
                <motion.span
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-mono text-[9px] tracking-[0.22em] text-muted-foreground uppercase"
                >
                  {fine ? "Drag to inspect" : "Tap to inspect"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </div>
  );
}
