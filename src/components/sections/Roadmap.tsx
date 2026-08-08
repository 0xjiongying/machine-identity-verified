import { Section, Shell, Eyebrow, Heading, Reveal } from "@/components/primitives";

const branches = ["Sale", "Leasing", "Financing", "Insurance", "Secondary market"];

export function Roadmap() {
  return (
    <Section label="Roadmap">
      <Shell>
        <Reveal>
          <Eyebrow index="11">Roadmap — not built yet</Eyebrow>
          <Heading>What a verified machine asset makes possible.</Heading>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[320px_1fr] lg:items-center">
          <Reveal>
            <div className="border border-primary/40 bg-surface/60 px-6 py-8">
              <p className="mt-label text-primary">Foundation · live in this prototype</p>
              <p className="mt-3 text-xl tracking-tight">Verified machine asset</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <ul className="grid gap-px bg-border sm:grid-cols-2">
              {branches.map((b) => (
                <li key={b} className="flex items-center justify-between bg-background px-5 py-5">
                  <span className="text-[15px] text-muted-foreground">{b}</span>
                  <span className="mt-mono border border-border px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Roadmap
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
