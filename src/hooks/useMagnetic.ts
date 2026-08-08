import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { SPRING } from "@/lib/motion";
import { useFinePointer, useReducedMotion } from "./useMotionPrefs";

/**
 * Magnetic pointer attraction for CTAs.
 * Returns a ref for the element plus springs for the shell and inner label so
 * they can travel at different rates (parallax within the button).
 */
export function useMagnetic(strength = 0.34, radius = 90) {
  const ref = useRef<HTMLElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const lx = useMotionValue(0);
  const ly = useMotionValue(0);
  const sx = useSpring(x, SPRING.magnet);
  const sy = useSpring(y, SPRING.magnet);
  const slx = useSpring(lx, SPRING.magnet);
  const sly = useSpring(ly, SPRING.magnet);

  const fine = useFinePointer();
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !fine || reduced) return;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = Math.max(r.width, r.height) / 2 + radius;
      if (dist > reach) {
        x.set(0);
        y.set(0);
        lx.set(0);
        ly.set(0);
        return;
      }
      const falloff = 1 - dist / reach;
      x.set(dx * strength * falloff);
      y.set(dy * strength * falloff);
      lx.set(dx * strength * 0.35 * falloff);
      ly.set(dy * strength * 0.35 * falloff);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
      lx.set(0);
      ly.set(0);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [fine, reduced, strength, radius, x, y, lx, ly]);

  return { ref, x: sx, y: sy, labelX: slx, labelY: sly, enabled: fine && !reduced };
}