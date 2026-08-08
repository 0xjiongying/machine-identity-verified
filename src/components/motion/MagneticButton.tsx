import type { ReactNode } from "react";
import { motion } from "motion/react";
import { useMagnetic } from "@/hooks/useMagnetic";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "outline";
  className?: string;
  cursor?: string;
  disabled?: boolean;
  type?: "button" | "submit";
};

/**
 * Primary CTA with magnetic pointer attraction — the shell drifts toward the
 * cursor and the label drifts less, creating depth inside the control.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = "solid",
  className,
  cursor = "open",
  disabled,
  type = "button",
}: Props) {
  const { ref, x, y, labelX, labelY } = useMagnetic();

  const base = cn(
    "relative inline-flex items-center justify-center gap-3 overflow-hidden border px-5 py-3 text-[13px] font-medium",
    variant === "solid"
      ? "border-foreground bg-foreground text-background"
      : "border-border text-foreground",
    disabled && "pointer-events-none opacity-50",
    className,
  );

  const inner = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 origin-bottom scale-y-0 transition-transform duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-y-100",
          variant === "solid" ? "bg-primary" : "bg-foreground/[0.06]",
        )}
      />
      <motion.span style={{ x: labelX, y: labelY }} className="relative flex items-center gap-3">
        {children}
      </motion.span>
    </>
  );

  if (href) {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        data-cursor={cursor}
        style={{ x, y }}
        className={cn("group", base)}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-cursor={cursor}
      style={{ x, y }}
      className={cn("group", base)}
    >
      {inner}
    </motion.button>
  );
}
