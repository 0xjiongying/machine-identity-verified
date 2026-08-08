import { Link } from "@tanstack/react-router";
import { Shell, Reveal } from "@/components/primitives";
import { LogoMark } from "@/components/navigation/Logo";

export function FooterCTA() {
  return (
    <footer className="border-t border-border">
      <Shell className="py-28 md:py-40">
        <Reveal>
          <h2 className="max-w-[18ch] text-[length:var(--text-hero)] font-medium leading-[0.95] tracking-[-0.04em]">
            Verified identity unlocks machine finance.
          </h2>
          <p className="mt-7 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
            Machine Trust is a CVI-gated Compliant DeFi market — passport context, Cleanverse access
            control, Monad loan execution.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#finance"
              data-cursor="inspect"
              className="border border-foreground bg-foreground px-5 py-3 text-[13px] font-medium text-background transition-colors hover:border-primary hover:bg-primary"
            >
              Check Eligibility
            </a>
            <a
              href="#inspect"
              className="border border-border px-5 py-3 text-[13px] transition-colors hover:border-foreground"
            >
              Explore Machine
            </a>
          </div>
        </Reveal>
      </Shell>

      <Shell className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-7">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-4 text-muted-foreground" />
          <span className="mt-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Machine Trust
          </span>
        </div>
        <p className="mt-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Prototype · Cleanverse Build: Trusted Assets · RWA track
        </p>
        <Link
          to="/explorer"
          className="mt-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          Explorer
        </Link>
      </Shell>
    </footer>
  );
}
