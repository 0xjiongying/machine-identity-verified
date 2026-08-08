import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { LogoMark } from "./Logo";
import { cn } from "@/lib/utils";

const links = [
  { label: "Machines", href: "#machines" },
  { label: "Passport", href: "#passport" },
  { label: "Transfers", href: "#transfer" },
  { label: "Network", href: "#architecture" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-border bg-background/72 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-6 px-6 md:px-10 lg:px-16"
      >
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5" data-cursor="home">
          <LogoMark className="size-5 shrink-0 text-foreground" />
          <span className="truncate text-[13px] font-medium tracking-[-0.01em]">MachineTrust</span>
        </Link>

        <ul className="mx-auto hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="mt-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <Link
            to="/explorer"
            className="mt-mono hidden px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
          >
            Explorer
          </Link>
          <button
            type="button"
            data-cursor="connect"
            className="mt-mono border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Connect
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
