import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Prefer raster for pixel-perfect brand mark; svg for crisp scaling. */
  variant?: "color" | "svg";
};

/**
 * Machine Trust brand mark — chamfered frame, M + check, purple accent stem.
 * Asset: /brand/machine-trust-mark.png|svg
 */
export function LogoMark({ className = "size-6", variant = "color" }: LogoProps) {
  const src =
    variant === "svg" ? "/brand/machine-trust-mark.svg" : "/brand/machine-trust-mark-128.png";

  return (
    <img
      src={src}
      alt="Machine Trust"
      width={128}
      height={128}
      className={cn("shrink-0 rounded-[2px] object-cover", className)}
      decoding="async"
    />
  );
}

/** Inline SVG for contexts that need currentColor-free crisp vectors. */
export function LogoMarkSvg({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Machine Trust logo"
    >
      <rect width="512" height="512" fill="#000000" />
      <path
        fill="#F2F2F2"
        fillRule="evenodd"
        d="M104 40H408L472 104V408L408 472H104L40 408V104L104 40ZM128 96L96 128V384L128 416H384L416 384V128L384 96H128Z"
      />
      <path fill="#F2F2F2" d="M152 148H220L200 176V368H152V148Z" />
      <path fill="#8A63D2" d="M292 148H360V368H292V148Z" />
      <path fill="#F2F2F2" d="M220 236L256 318L448 92L398 56L256 236L236 208Z" />
    </svg>
  );
}
