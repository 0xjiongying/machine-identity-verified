import { motion, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "@/hooks/useMotionPrefs";

/**
 * Site-wide background: black base, fine technical grid that drifts with
 * scroll, a slow light field and a single travelling scan line.
 */
export function AmbientField() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const gridY = useTransform(scrollYProgress, [0, 1], ["0px", "-90px"]);
  const fieldY = useTransform(scrollYProgress, [0, 1], ["-8%", "18%"]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      <motion.div
        className="mt-grid-bg absolute inset-[-10%] opacity-[0.5]"
        style={{ y: reduced ? "0px" : gridY }}
      />
      <motion.div
        className="absolute left-1/2 top-0 h-[70vh] w-[120vw] -translate-x-1/2 opacity-70 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_16%,transparent),transparent)]"
        style={{ y: reduced ? "0%" : fieldY }}
      />
      <div className="mt-noise absolute inset-0 opacity-[0.35]" />
      {reduced ? null : (
        <motion.div
          className="absolute inset-x-0 h-px bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--primary)_45%,transparent),transparent)]"
          initial={{ top: "-2%", opacity: 0 }}
          animate={{ top: ["-2%", "102%"], opacity: [0, 0.6, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear", repeatDelay: 5 }}
        />
      )}
    </div>
  );
}