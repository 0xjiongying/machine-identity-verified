import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "@tanstack/react-router";
import { EASE } from "@/lib/motion";

/**
 * Route change plays a machined wipe: a black panel sweeps across, the new
 * route fades up behind it. Keeps navigation feeling continuous, not paged.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: EASE.expoOut }}
      >
        <motion.div
          key={`${pathname}-wipe`}
          className="pointer-events-none fixed inset-0 z-[70] origin-left bg-primary/90"
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: 0.7, ease: EASE.cinematic }}
          aria-hidden="true"
        />
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
