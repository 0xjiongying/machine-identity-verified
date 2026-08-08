import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-16", className)}>
      {children}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  label,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      id={id}
      aria-label={label}
      className={cn("relative border-t border-border py-24 md:py-32", className)}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children, index }: { children: ReactNode; index?: string }) {
  return (
    <div className="flex items-center gap-3">
      {index ? <span className="mt-mono text-[11px] text-primary">{index}</span> : null}
      <span className="mt-label">{children}</span>
      <span className="mt-hairline hidden flex-1 sm:block" />
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "mt-6 max-w-[20ch] text-[length:var(--text-display)] font-medium leading-[1.02]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "mt-5 max-w-[58ch] text-[15px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function StatusDot({ tone = "neutral" }: { tone?: "neutral" | "ok" | "fail" | "accent" }) {
  const map = {
    neutral: "bg-muted-foreground",
    ok: "bg-success",
    fail: "bg-destructive",
    accent: "bg-primary",
  } as const;
  return (
    <span className={cn("inline-block size-1.5 rounded-full", map[tone])} aria-hidden="true" />
  );
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "mt-mono inline-flex items-center gap-1.5 border border-border px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
    >
      <StatusDot tone="accent" /> Demo data
    </span>
  );
}
