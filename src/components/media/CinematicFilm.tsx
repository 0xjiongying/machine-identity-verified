import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import film from "@/assets/machine-cinematic.mp4.asset.json";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useMotionPrefs";

/**
 * Scroll-scrubbed cinematic machine footage used as a section transition.
 * If the video cannot load (or motion is reduced) the band degrades to a
 * static machined gradient — never a broken frame.
 */
export function CinematicFilm({ caption, className }: { caption: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.14, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);
  const veil = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 0.45, 0.85]);

  // Scroll position drives playhead — the footage is a timeline, not a loop.
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const unsub = scrollYProgress.on("change", (p) => {
      const v = video.current;
      if (!v || !v.duration || Number.isNaN(v.duration)) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        v.currentTime = Math.min(v.duration - 0.05, Math.max(0, p * v.duration));
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [scrollYProgress, reduced]);

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className={cn("relative h-[52vh] min-h-[320px] overflow-hidden bg-background", className)}
    >
      <motion.div className="absolute inset-0" style={{ scale, y }}>
        {!failed ? (
          <video
            ref={video}
            className={cn(
              "size-full object-cover opacity-0 transition-opacity duration-1000 grayscale contrast-125",
              ready && "opacity-100",
            )}
            src={film.url}
            muted
            playsInline
            preload="metadata"
            onLoadedData={() => setReady(true)}
            onError={() => setFailed(true)}
          />
        ) : null}
        {(!ready || failed) && (
          <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_70%)]" />
        )}
      </motion.div>

      <motion.div className="absolute inset-0 bg-background" style={{ opacity: veil }} />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />

      <div className="absolute inset-0 flex items-end">
        <p className="mt-mono mx-auto w-full max-w-[1280px] px-6 pb-10 text-[10px] tracking-[0.2em] text-muted-foreground uppercase md:px-10 lg:px-16">
          {caption}
        </p>
      </div>
    </div>
  );
}
