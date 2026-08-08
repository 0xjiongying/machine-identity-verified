import { Section, Shell, Eyebrow, Reveal } from "@/components/primitives";

const modules = [
  { n: "01", k: "Identity", v: "Persistent machine identity" },
  { n: "02", k: "Provenance", v: "Lifecycle and ownership history" },
  { n: "03", k: "Compliance", v: "Verified participants and controlled transfers" },
  { n: "04", k: "Programmability", v: "Machine assets that can participate in on-chain workflows" },
];

export function ValueModules() {
  return (
    <Section label="Product value">
      <Shell>
        <Reveal>
          <Eyebrow index="09">Product value</Eyebrow>
        </Reveal>
        <div className="mt-12 grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {modules.map((m, i) => (
            <Reveal key={m.n} delay={i * 0.09}>
              <div className="h-full bg-background px-6 py-10">
                <p className="mt-mono text-[11px] tracking-[0.2em] text-primary">{m.n}</p>
                <p className="mt-6 text-[18px] tracking-tight">{m.k}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{m.v}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Shell>
    </Section>
  );
}
