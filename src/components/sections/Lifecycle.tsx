import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Section, Shell, Eyebrow, Lede, Reveal, StatusDot } from "@/components/primitives";
import { KineticHeading, TiltCard } from "@/components/motion/Kinetic";
import { ownershipHistory, maintenanceLog } from "@/data/demoMachine";
import { useAssetState } from "@/lib/asset-state";
import { EASE } from "@/lib/motion";

/**
 * Ownership timeline + maintenance lifecycle. One vertical spine draws itself
 * to scroll; each entry latches on as the spine passes it.
 */
export function Lifecycle() {
  const ref = useRef<HTMLDivElement>(null);
  const { owner, previousOwner } = useAssetState();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const spine = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // The transfer entry only exists once the demo transfer has settled.
  const timeline = ownershipHistory
    .filter((o) => (o.action === "Compliant transfer" ? Boolean(previousOwner) : true))
    .map((o) => (o.year === "Current" ? { ...o, entity: owner } : o));

  return (
    <Section id="lifecycle" label="Lifecycle" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="03">Lifecycle</Eyebrow>
        </Reveal>
        <KineticHeading text="Ownership and service, on one continuous spine." />
        <Reveal delay={0.1}>
          <Lede>
            A machine's value is its history. Every transfer and every service event attaches to the
            same record, so the asset can be underwritten instead of inspected.
          </Lede>
        </Reveal>

        <div ref={ref} className="relative mt-16 grid gap-14 lg:grid-cols-2">
          {/* spine */}
          <div className="pointer-events-none absolute left-[7px] top-0 hidden h-full w-px bg-border lg:block">
            <motion.div className="h-full w-px origin-top bg-primary" style={{ scaleY: spine }} />
          </div>

          <div className="lg:pl-10">
            <p className="mt-label">Ownership timeline</p>
            <ul className="mt-6 space-y-px">
              {timeline.map((o, i) => (
                <motion.li
                  key={`${o.year}-${i}`}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-15% 0px" }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: EASE.expoOut }}
                  className="relative border border-border bg-surface/40 px-5 py-5"
                >
                  <span className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                    {o.year}
                  </span>
                  <p className="mt-2 text-[15px]">{o.entity}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{o.action}</p>
                  <p className="mt-mono mt-3 text-[11px] text-muted-foreground">{o.ref}</p>
                </motion.li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mt-label">Maintenance lifecycle</p>
            <div className="mt-6 space-y-px">
              {maintenanceLog.map((m, i) => (
                <TiltCard key={m.date} strength={4}>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-12% 0px" }}
                    transition={{ duration: 0.7, delay: i * 0.06, ease: EASE.expoOut }}
                    className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border border-border bg-surface/40 px-5 py-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px]">{m.work}</p>
                      <p className="mt-1 text-[13px] text-muted-foreground">{m.tech}</p>
                    </div>
                    <div className="text-right">
                      <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        {m.date}
                      </p>
                      <p className="mt-mono mt-1 flex items-center justify-end gap-2 text-[11px] uppercase tracking-[0.18em] text-success">
                        <StatusDot tone="ok" /> {m.result}
                      </p>
                    </div>
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    </Section>
  );
}
