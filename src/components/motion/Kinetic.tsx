import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useMotionPrefs";

function Word({
  word,
  index,
  total,
  progress,
  reduced,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  reduced: boolean;
}) {
  const start = (index / Math.max(total, 1)) * 0.55;
  const end = start + 0.45;
  const y = useTransform(progress, [start, end], ["105%", "0%"]);
  const opacity = useTransform(progress, [start, end], [0, 1]);
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <motion.span
        className="inline-block will-change-transform"
        style={reduced ? undefined : { y, opacity }}
      >
        {word}
        {"\u00A0"}
      </motion.span>
    </span>
  );
}

/**
 * Kinetic heading — each word rises from behind a hard mask edge, scrubbed by
 * scroll so type reads as machined material rather than a fade-in.
 */
export function KineticHeading({
  text,
  className,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 92%", "start 45%"] });
  const words = text.split(" ");

  return (
    <div ref={ref}>
      <Tag
        className={cn(
          "mt-6 max-w-[20ch] text-[length:var(--text-display)] font-medium leading-[1.02]",
          className,
        )}
      >
        {words.map((w, i) => (
          <Word
            key={`${w}-${i}`}
            word={w}
            index={i}
            total={words.length}
            progress={scrollYProgress}
            reduced={reduced}
          />
        ))}
      </Tag>
    </div>
  );
}

/** Card that tilts toward the pointer with damped, weighty physics. */
export function TiltCard({
  children,
  className,
  strength = 6,
}: {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={cn("[transform-style:preserve-3d]", className)}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg) translateZ(0)`;
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (el) el.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
      }}
      style={{ transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      {children}
    </motion.div>
  );
}

/** A pulse travelling along an SVG path — used for verification data flows. */
export function FlowPulse({
  d,
  duration = 2.2,
  delay = 0,
  className,
}: {
  d: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.path
      d={d}
      className={cn("text-primary", className)}
      stroke="currentColor"
      strokeWidth="1.2"
      fill="none"
      strokeLinecap="round"
      strokeDasharray="10 220"
      initial={{ strokeDashoffset: 230 }}
      animate={{ strokeDashoffset: -10 }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}
