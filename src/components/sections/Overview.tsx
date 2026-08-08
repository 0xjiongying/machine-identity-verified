import { Section, Shell, Eyebrow, Reveal, DemoTag } from "@/components/primitives";

const LAYERS = [
  {
    k: "Machine Trust",
    q: "What is being financed?",
    v: "Machine Passport — identity, parts, service history and ownership context for one physical machine.",
  },
  {
    k: "Cleanverse",
    q: "Who may borrow?",
    v: "CVI / A-Pass verifies the borrower. CCP (verify_apass) decides pool eligibility. No valid CVI → access blocked.",
  },
  {
    k: "Monad",
    q: "What executes?",
    v: "MachineTrustLending loan state — borrow, interest, repay — only after off-chain compliance unlocks eligibility.",
  },
];

/**
 * The first 30 seconds. A judge landing here should know this is Compliant DeFi.
 */
export function Overview() {
  return (
    <Section id="overview" label="What Machine Trust is" className="scroll-mt-16">
      <Shell>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal>
            <Eyebrow index="01">In one paragraph</Eyebrow>
            <p className="mt-6 max-w-[36ch] text-[length:var(--text-display)] font-medium leading-[1.05]">
              Verified identity unlocks compliant machine finance.
            </p>
            <p className="mt-6 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
              Machine Trust is a CVI-gated DeFi market. The Machine Passport describes the asset.
              Cleanverse verifies the borrower. Only then can they enter the USDC Machine Finance
              Pool. Monad executes the loan — never before compliance clears.
            </p>
            <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
              Without verified identity, there is no credit line. That is the protocol rule — not a
              badge on the page.
            </p>
            <DemoTag className="mt-7" />
          </Reveal>

          <Reveal delay={0.12}>
            <ul className="grid gap-px border border-border bg-border">
              {LAYERS.map((l, i) => (
                <li key={l.k} className="bg-background px-5 py-6 sm:px-7">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                      {l.k}
                    </p>
                    <span className="mt-mono text-[10px] text-muted-foreground">
                      LAYER {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px]">{l.q}</p>
                  <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
                    {l.v}
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
