import { useState } from "react";
import { motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";
import { cn } from "@/lib/utils";

const layers = [
  {
    key: "physical",
    label: "Physical world",
    value: "Industrial machine",
    note: "The asset exists, works and wears — but carries no shared record.",
  },
  {
    key: "mt",
    label: "Machine Trust",
    value: "Machine Passport",
    note: "Persistent identity: provenance, ownership, service and parts.",
  },
  {
    key: "cv",
    label: "Cleanverse",
    value: "CVI + CVA + Compliance",
    note: "Who may participate, and whether this transaction may proceed.",
  },
  {
    key: "monad",
    label: "Monad",
    value: "Execution",
    note: "Approved transactions settle and ownership state becomes canonical.",
  },
  {
    key: "asset",
    label: "Result",
    value: "Verified machine asset",
    note: "A programmable asset with an auditable history.",
  },
];

export function Architecture() {
  const [active, setActive] = useState<string>("mt");

  return (
    <Section id="architecture" label="Architecture" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="07">Architecture</Eyebrow>
          <Heading>Three layers, one transaction path.</Heading>
          <Lede>
            Each layer answers exactly one question. Keeping them separate is what makes the system
            legible to engineers, operators and regulators at the same time.
          </Lede>
        </Reveal>

        <ol className="mt-14 grid gap-px bg-border">
          {layers.map((l, i) => {
            const on = active === l.key;
            return (
              <li key={l.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(l.key)}
                  onFocus={() => setActive(l.key)}
                  onClick={() => setActive(l.key)}
                  data-cursor="inspect"
                  aria-expanded={on}
                  className={cn(
                    "group grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-5 bg-background px-5 py-6 text-left transition-colors sm:grid-cols-[80px_240px_minmax(0,1fr)] sm:items-center",
                    on ? "bg-surface" : "hover:bg-surface/60",
                  )}
                >
                  <span
                    className={cn(
                      "mt-mono text-[11px] tracking-[0.18em]",
                      on ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="mt-label block">{l.label}</span>
                    <span className="mt-1.5 block text-[17px] tracking-tight">{l.value}</span>
                  </span>
                  <motion.span
                    animate={{ opacity: on ? 1 : 0.35 }}
                    transition={{ duration: 0.3 }}
                    className="col-span-2 text-[13px] leading-relaxed text-muted-foreground sm:col-span-1"
                  >
                    {l.note}
                  </motion.span>
                </button>
                {i < layers.length - 1 ? (
                  <div className="relative h-px bg-border" aria-hidden="true">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-primary"
                      animate={{ width: on ? "100%" : "0%" }}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Shell>
    </Section>
  );
}
