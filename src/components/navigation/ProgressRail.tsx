import { useEffect, useState } from "react";
import { motion, useScroll } from "motion/react";
import { cn } from "@/lib/utils";

const CHAPTERS = [
  { id: "hero", n: "00", label: "Machine" },
  { id: "overview", n: "01", label: "What it is" },
  { id: "inspect", n: "03", label: "Inspect" },
  { id: "passport", n: "04", label: "Passport" },
  { id: "participants", n: "06", label: "Parties" },
  { id: "finance", n: "08", label: "Finance" },
  { id: "audit", n: "10", label: "Trace" },
  { id: "architecture", n: "11", label: "Layers" },
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
    <aside
      aria-label="Section progress"
      className="pointer-events-none fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 xl:block"
    >
      <div className="pointer-events-auto relative pl-3">
        <div className="absolute bottom-1 left-0 top-1 w-px bg-border" aria-hidden="true">
          <motion.div className="w-px origin-top bg-primary" style={{ scaleY: scrollYProgress }} />
        </div>
        <ol className="space-y-3">
          {CHAPTERS.map((c) => {
            const on = active === c.id;
            return (
              <li key={c.id}>
                <a
                  href={`#${c.id}`}
                  className={cn(
                    "mt-mono block text-[10px] uppercase tracking-[0.16em] transition-colors",
                    on ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="mr-2 opacity-60">{c.n}</span>
                  {c.label}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
