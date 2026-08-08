import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useMotionPrefs";
import { cn } from "@/lib/utils";

const GLYPHS = "0123456789abcdef";

/**
 * Resolves a transaction reference character by character, the way a settlement
 * hash materialises once a block confirms.
 */
export function HashReveal({
  value,
  className,
  speed = 26,
}: {
  value: string;
  className?: string;
  speed?: number;
}) {
  const reduced = useReducedMotion();
  const [text, setText] = useState(reduced ? value : "");
  const frame = useRef(0);

  useEffect(() => {
    if (reduced) {
      setText(value);
      return;
    }
    let raf = 0;
    frame.current = 0;
    const tick = () => {
      frame.current += 1;
      const resolved = Math.floor(frame.current / (speed / 10));
      const out = value
        .split("")
        .map((c, i) => {
          if (i < resolved) return c;
          if (c === " " || c === "/" || c === ":" || c === "…") return c;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");
      setText(out);
      if (resolved <= value.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, speed]);

  return (
    <span className={cn("mt-mono tabular-nums", className)} aria-label={value}>
      {text}
    </span>
  );
}
