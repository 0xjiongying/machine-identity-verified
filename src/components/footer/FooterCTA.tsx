import { Link } from "@tanstack/react-router";
import { Shell, Reveal } from "@/components/primitives";
import { LogoMark } from "@/components/navigation/Logo";
import { CleanverseWordmark } from "@/components/brand/CleanverseLogo";

export function FooterCTA() {
  return (
    <footer className="border-t border-border">
      <Shell className="py-28 md:py-40">
        <Reveal>
          <h2 className="max-w-[18ch] text-[length:var(--text-hero)] font-medium leading-[0.95] tracking-[-0.04em]">
            Trust the machine. Program the asset.
          </h2>
          <p className="mt-7 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
            Machine Trust connects Machine Passports to Cleanverse CVI + CVA under CCP — trust
            before value moves — then Monad settlement. Issuance and transfer only happen when
            compliance actually clears.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="#issuance"
              data-cursor="issue"
              className="border border-foreground bg-foreground px-5 py-3 text-[13px] font-medium text-background transition-colors hover:border-primary hover:bg-primary"
            >
              Issue RWA
            </a>
            <a
              href="#transfer"
              className="border border-border px-5 py-3 text-[13px] transition-colors hover:border-foreground"
            >
              Run Transfer Demo
            </a>
          </div>
          <p className="mt-mono mt-8 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Live demo · add URL · Demo video · add link · Repo must be public for submission
          </p>
        </Reveal>
      </Shell>

      <Shell className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-7">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-4 text-muted-foreground" />
          <span className="mt-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Machine Trust
          </span>
        </div>
        <a
          href="https://cleanverse.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Cleanverse — Trust Framework partner"
        >
          <span className="mt-mono text-[10px] uppercase tracking-[0.16em]">Built on</span>
          <CleanverseWordmark className="h-3.5 w-auto max-w-[120px]" />
        </a>
        <p className="mt-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Track 1 RWA · API v5.6
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
