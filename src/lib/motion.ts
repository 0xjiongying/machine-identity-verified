/**
 * Central motion system.
 * Every animation in Machine Trust uses these durations and curves so that the
 * whole site reads as one continuous mechanical language.
 */

export const DUR = {
  fast: 0.22,
  normal: 0.5,
  slow: 0.9,
  cinematic: 1.6,
} as const;

/** Cubic beziers tuned to feel like engineered movement, not UI easing. */
export const EASE = {
  /** expo.out — fast departure, long settle. Default for reveals. */
  expoOut: [0.16, 1, 0.3, 1],
  /** power3.out — mechanical deceleration. */
  power3Out: [0.215, 0.61, 0.355, 1],
  /** power4.out — heavy mass coming to rest. */
  power4Out: [0.165, 0.84, 0.44, 1],
  /** in-out for camera-like moves. */
  cinematic: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, [number, number, number, number]>;

export const SPRING = {
  soft: { type: "spring", stiffness: 120, damping: 20, mass: 0.9 },
  precise: { type: "spring", stiffness: 320, damping: 34, mass: 0.6 },
  pointer: { stiffness: 700, damping: 45, mass: 0.4 },
  magnet: { stiffness: 260, damping: 18, mass: 0.5 },
} as const;

/** Standard viewport trigger so sections activate at the same point. */
export const VIEW = { once: true, margin: "-12% 0px" } as const;

export const reveal = (delay = 0, y = 24) => ({
  initial: { opacity: 0, y },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEW,
  transition: { duration: DUR.slow, delay, ease: EASE.expoOut },
});

/** Clip-path line reveal used for headline choreography. */
export const lineReveal = (delay = 0) => ({
  initial: { opacity: 0, y: 80, clipPath: "inset(100% 0 0 0)" },
  animate: { opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" },
  transition: { duration: 1.1, delay, ease: EASE.expoOut },
});

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));
