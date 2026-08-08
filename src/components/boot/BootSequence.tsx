import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useMotionPrefs";

const STAGES = [
  "Loading asset system",
  "Loading passport",
  "Loading verification",
  "Loading compliance",
  "System ready",
];

const KEY = "machineTrustIntroSeen";

/**
 * Cinematic initialization. The MachineTrust mark draws itself as a technical
 * line, fills solid at 100%, then hands off to the hero.
 */
export function BootSequence() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(KEY) === "1";
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || mq) return;
    setActive(true);
    document.documentElement.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    if (!active) return;
    const total = 2100;
    const start = performance.now();
    // Timer-driven so the sequence still completes if rAF is throttled while
    // the WebGL scene and fonts are warming up.
    const id = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / total);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      setStage(Math.min(STAGES.length - 1, Math.floor(eased * STAGES.length)));
      if (t >= 1) {
        window.clearInterval(id);
        finish();
      }
    }, 32);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function finish() {
    window.localStorage.setItem(KEY, "1");
    document.documentElement.style.overflow = "";
    setActive(false);
  }

  if (reduced) return null;

  const pct = Math.round(progress * 100);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="boot"
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: EASE.cinematic }}
          role="status"
          aria-live="polite"
        >
          <div className="mt-grid-bg pointer-events-none absolute inset-0 opacity-30" />

          <svg
            viewBox="0 0 64 64"
            className="relative size-16"
            fill="none"
            aria-hidden="true"
            role="presentation"
          >
            <motion.rect
              x="6"
              y="6"
              width="52"
              height="52"
              stroke="currentColor"
              className="text-foreground"
              strokeWidth="1.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: Math.min(1, progress * 1.5) }}
              transition={{ duration: 0 }}
            />
            <motion.path
              d="M18 44V20l14 14 14-14v24"
              stroke="currentColor"
              className="text-primary"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress }}
              transition={{ duration: 0 }}
            />
            <motion.rect
              x="6"
              y="6"
              width="52"
              height="52"
              className="fill-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: progress > 0.985 ? 0.12 : 0 }}
            />
          </svg>

          <p className="mt-mono relative mt-8 text-[11px] uppercase tracking-[0.3em] text-foreground">
            Initializing MachineTrust
          </p>

          <div className="relative mt-6 h-px w-[220px] bg-border">
            <div
              className="h-px bg-primary transition-none"
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>

          <div className="relative mt-5 flex w-[220px] items-baseline justify-between">
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24 }}
                className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
              >
                {STAGES[stage]}
              </motion.span>
            </AnimatePresence>
            <span className="mt-mono text-[10px] tabular-nums text-primary">{pct}%</span>
          </div>

          <button
            onClick={finish}
            className="mt-mono relative mt-12 text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}