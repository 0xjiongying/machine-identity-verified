import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";

const lifecycle = [
  "Manufactured",
  "Deployed",
  "Maintained",
  "Part replaced",
  "Transferred",
  "Resold",
];
const silos = [
  "Manufacturer DB",
  "Maintenance DB",
  "Ownership docs",
  "Leasing records",
  "Compliance system",
];

export function TrustGap() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const width = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <Section id="machines" label="The trust gap">
      <Shell>
        <Reveal>
          <Eyebrow index="02">The trust gap</Eyebrow>
          <Heading>
            A machine has a history.
            <br />
            Most systems don&apos;t share it.
          </Heading>
          <Lede>
            Every industrial asset accumulates a lifecycle. That lifecycle is scattered across
            systems that never reconcile — so buyers, lenders and regulators inherit uncertainty.
          </Lede>
        </Reveal>

        <div ref={ref} className="mt-16">
          <div className="relative">
            <div className="absolute left-0 right-0 top-[7px] h-px bg-border" aria-hidden="true" />
            <motion.div
              style={{ width }}
              className="absolute left-0 top-[7px] h-px bg-primary"
              aria-hidden="true"
            />
            <ol className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {lifecycle.map((step, i) => (
                <motion.li
                  key={step}
                  initial={{ opacity: 0.25, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.6, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                  className="relative pr-4"
                >
                  <span className="relative z-10 block size-[15px] rounded-full border border-border bg-background">
                    <span className="absolute inset-[4px] rounded-full bg-primary" />
                  </span>
                  <p className="mt-mono mt-4 text-[11px] uppercase tracking-[0.16em]">{step}</p>
                  <p className="mt-label mt-1">Event {String(i + 1).padStart(2, "0")}</p>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <ul className="grid gap-px bg-border">
              {silos.map((s, i) => (
                <motion.li
                  key={s}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-8% 0px" }}
                  transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-between bg-background px-4 py-3.5"
                >
                  <span className="text-[13px] text-muted-foreground">{s}</span>
                  <span className="mt-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                    Isolated
                  </span>
                </motion.li>
              ))}
            </ul>

            <Reveal delay={0.2} className="flex items-center justify-center">
              <svg
                viewBox="0 0 120 200"
                className="hidden h-44 w-24 text-border lg:block"
                aria-hidden="true"
              >
                {[20, 60, 100, 140, 180].map((y) => (
                  <path
                    key={y}
                    d={`M0 ${y} C60 ${y}, 60 100, 120 100`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.7"
                  />
                ))}
              </svg>
              <span className="mt-label lg:hidden">converges into</span>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="border border-primary/40 bg-surface/60 p-6">
                <p className="mt-label text-primary">Result</p>
                <p className="mt-3 text-2xl font-medium tracking-tight">Machine Passport</p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  One persistent record that survives owners, service providers and jurisdictions —
                  and can be verified by anyone entitled to see it.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Shell>
    </Section>
  );
}
