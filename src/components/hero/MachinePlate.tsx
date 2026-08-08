import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";
import { demoMachine } from "@/data/demoMachine";

const draw = (delay: number) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: { duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] as const },
});

/**
 * Abstract machine-identity object: a 2.5D asset identification plate.
 * Technical lines draw themselves, metadata resolves progressively.
 */
export function MachinePlate() {
  const ref = useRef<HTMLDivElement>(null);
  const calm = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 20 });

  return (
    <div
      ref={ref}
      data-cursor="inspect"
      onPointerMove={(e) => {
        if (calm) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative [perspective:1400px]"
      aria-label={`Machine identity object for ${demoMachine.model}`}
      role="img"
    >
      <motion.div
        style={{ rotateX: calm ? 0 : rx, rotateY: calm ? 0 : ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="absolute -inset-24 -z-10 opacity-60 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]" />

        <div className="relative border border-border bg-surface/60 p-5 shadow-[var(--shadow-lift)] backdrop-blur-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mt-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                {demoMachine.index}
              </p>
              <p className="mt-2 text-lg font-medium tracking-tight sm:text-xl">
                {demoMachine.model}
              </p>
              <p className="mt-label mt-1">SERIAL {demoMachine.serial.replace("IRB6700-", "")}</p>
            </div>
            <div className="mt-mono border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {demoMachine.id}
            </div>
          </div>

          <svg viewBox="0 0 420 190" className="mt-6 w-full text-border" aria-hidden="true">
            <motion.rect
              x="10"
              y="10"
              width="400"
              height="170"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              {...draw(0.6)}
            />
            <motion.path
              d="M40 150 L40 92 L120 60 L200 92 L200 150"
              fill="none"
              stroke="var(--foreground)"
              strokeWidth="0.9"
              {...draw(0.9)}
            />
            <motion.path
              d="M120 60 L120 30 M120 30 L300 30 L300 150"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              {...draw(1.1)}
            />
            <motion.path
              d="M200 92 L300 60"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="0.9"
              {...draw(1.3)}
            />
            <motion.circle
              cx="120"
              cy="60"
              r="4"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="0.9"
              {...draw(1.5)}
            />
            <motion.circle
              cx="300"
              cy="60"
              r="2.5"
              fill="var(--primary)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7 }}
            />
            <motion.path
              d="M10 150 L410 150"
              stroke="currentColor"
              strokeWidth="0.6"
              {...draw(0.75)}
            />
            {[60, 100, 140, 180, 220, 260, 300, 340, 380].map((x, i) => (
              <motion.path
                key={x}
                d={`M${x} 150 L${x} 158`}
                stroke="currentColor"
                strokeWidth="0.6"
                {...draw(1.2 + i * 0.04)}
              />
            ))}
            <motion.text
              x="10"
              y="176"
              className="mt-mono"
              fill="var(--muted-foreground)"
              fontSize="7"
              letterSpacing="2.4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.8 }}
            >
              GEOMETRY / REACH 2.60 M / PAYLOAD 235 KG
            </motion.text>
          </svg>

          <dl className="mt-6 grid grid-cols-3 gap-px border border-border bg-border">
            {[
              { k: "Status", v: "VERIFIED", tone: "text-success" },
              { k: "Ownership", v: "ACTIVE", tone: "text-foreground" },
              {
                k: "Provenance",
                v: `${demoMachine.provenanceEvents} EVENTS`,
                tone: "text-foreground",
              },
            ].map((item, i) => (
              <motion.div
                key={item.k}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.9 + i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="bg-background/80 px-3 py-3"
              >
                <dt className="mt-label">{item.k}</dt>
                <dd className={`mt-mono mt-1.5 text-[11px] tracking-[0.12em] ${item.tone}`}>
                  {item.v}
                </dd>
              </motion.div>
            ))}
          </dl>
        </div>
      </motion.div>
    </div>
  );
}
