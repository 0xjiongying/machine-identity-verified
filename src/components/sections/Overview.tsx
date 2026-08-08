import { Section, Shell, Eyebrow, Reveal, DemoTag } from "@/components/primitives";
import { CleanverseMark } from "@/components/brand/CleanverseLogo";
import { LogoMark } from "@/components/navigation/Logo";

const LAYERS = [
  {
    k: "Machine Trust",
    q: "What is this asset?",
    v: "Machine passport, parts, service history and provenance for one physical machine.",
    brand: "mt" as const,
  },
  {
    k: "Cleanverse",
    q: "Who may transact — before value moves?",
    v: "Trust Framework interlocking CVI (verified identity), CVA (verified asset), and Programmed Governance via CCP — eligibility checked before issuance, transfer, or settlement.",
    brand: "cv" as const,
  },
  {
    k: "Monad",
    q: "What executes?",
    v: "Settlement only after CCP approval. In Sandbox UAT this is a labelled settlement reference until a custody contract is deployed.",
    brand: "none" as const,
  },
];

/**
 * The first 30 seconds. A judge landing here should know what the product is,
 * which problem it removes, and where Cleanverse sits — before scrolling.
 */
export function Overview() {
  return (
    <Section id="overview" label="What Machine Trust is" className="scroll-mt-16">
      <Shell>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal>
            <Eyebrow index="01">In one paragraph</Eyebrow>
            <p className="mt-6 max-w-[34ch] text-[length:var(--text-display)] font-medium leading-[1.05]">
              A machine is worth financing only if someone can prove what it is and who may own it.
            </p>
            <p className="mt-6 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
              Machine Trust gives an industrial machine a verifiable passport — identity, parts,
              service history, ownership. Cleanverse interlocking CVI and CVA under Programmed
              Governance (CCP) establishes trust before value moves. Monad executes only what
              Cleanverse approved — with a continuous audit trail.
            </p>
            <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
              Without verified identity and a pre-transaction gate, a tokenised machine is a picture
              of a machine. That is the gap this product closes.
            </p>
            <DemoTag className="mt-7" />
          </Reveal>

          <Reveal delay={0.12}>
            <ul className="grid gap-px border border-border bg-border">
              {LAYERS.map((l, i) => (
                <li key={l.k} className="bg-background px-5 py-6 sm:px-7">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {l.brand === "mt" ? <LogoMark className="size-4 text-foreground" /> : null}
                      {l.brand === "cv" ? (
                        <CleanverseMark className="size-4 text-foreground" />
                      ) : null}
                      <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                        {l.k}
                      </p>
                    </div>
                    <span className="mt-mono shrink-0 text-[10px] text-muted-foreground">
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
            <p className="mt-mono mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Lending · leasing · insurance · secondary markets = roadmap, not built
            </p>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
