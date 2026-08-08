import { useEffect, useState } from "react";
import { motion, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

const CHAPTERS = [
  { id: "hero", n: "01", label: "Machine" },
  { id: "passport", n: "02", label: "Passport" },
  { id: "participants", n: "03", label: "Verify" },
  { id: "issuance", n: "04", label: "Issue" },
  { id: "transfer", n: "05", label: "Transfer" },
  { id: "audit", n: "06", label: "Trace" },
];

/** Narrative progress rail — replaces the scrollbar with the story index. */
export function ProgressRail() {
  const { scrollYProgress } = useScroll();
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const targets = CHAPTERS.map((c) => document.getElementById(c.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.2, 0.6, 1] },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Section progress"
      className="pointer-events-none fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 2xl:block"
    >
      <motion.div
        className="absolute -left-3 top-0 w-px origin-top bg-primary/70"
        style={{ scaleY: scrollYProgress, height: "100%" }}
        aria-hidden="true"
      />
      <div className="absolute -left-3 top-0 h-full w-px bg-border" aria-hidden="true" />
      <ul className="flex flex-col gap-4">
        {CHAPTERS.map((c) => {
          const on = active === c.id;
          return (
            <li key={c.id}>
              <a
                href={`#${c.id}`}
                className="pointer-events-auto group flex items-center gap-2.5"
                data-cursor="open"
              >
                <span
                  className={cn(
                    "mt-mono text-[9px] tabular-nums transition-colors",
                    on ? "text-primary" : "text-muted-foreground/60",
                  )}
                >
                  {c.n}
                </span>
                <span
                  className={cn(
                    "mt-mono overflow-hidden whitespace-nowrap text-[9px] uppercase tracking-[0.2em] transition-all duration-500",
                    on
                      ? "max-w-[110px] text-foreground opacity-100"
                      : "max-w-0 opacity-0 group-hover:max-w-[110px] group-hover:opacity-70",
                  )}
                >
                  {c.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}