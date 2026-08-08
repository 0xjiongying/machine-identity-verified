import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";
import { auditTrail } from "@/data/demoMachine";
import { useAssetState } from "@/lib/asset-state";

export function AuditTrail() {
  const { extraEvents } = useAssetState();
  const list = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: list,
    offset: ["start 80%", "end 60%"],
  });
  // The provenance line draws itself as the history scrolls past.
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  return (
    <Section id="audit" label="Asset history" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="06">Asset history</Eyebrow>
          <Heading>Every state change leaves a trace.</Heading>
          <Lede>
            Registration, service, issuance and transfer accumulate into one auditable record — the
            proof that makes a machine financeable rather than merely photographed.
          </Lede>
        </Reveal>

        <div ref={list} className="relative mt-14">
          <div
            className="absolute -left-4 top-0 hidden h-full w-px bg-border lg:block"
            aria-hidden="true"
          >
            <motion.div className="h-full w-px origin-top bg-primary" style={{ scaleY: draw }} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border">
                  {["Timestamp", "Entity", "Action", "Verification", "Transaction"].map((h) => (
                    <th key={h} scope="col" className="mt-label py-3 pr-6 font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ...auditTrail,
                  ...extraEvents
                    .filter((e) => !auditTrail.some((a) => a.tx.endsWith(e.hash.slice(-4))))
                    .map((e) => ({
                      time: e.timestamp,
                      entity: "MachineTrust",
                      action: e.label,
                      verification: "CVI + POLICY",
                      tx: e.hash,
                    })),
                ].map((e, i) => (
                  <motion.tr
                    key={e.time}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-8% 0px" }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="group border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
                  >
                    <td className="mt-mono relative py-4 pr-6 text-[11px] text-muted-foreground">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[18px] top-1/2 hidden size-[7px] -translate-y-1/2 border border-primary bg-background transition-colors group-hover:bg-primary lg:block"
                      />
                      {e.time}
                    </td>
                    <td className="py-4 pr-6 text-[13px]">{e.entity}</td>
                    <td className="py-4 pr-6 text-[13px] text-foreground">{e.action}</td>
                    <td className="mt-mono py-4 pr-6 text-[11px] text-success">{e.verification}</td>
                    <td className="mt-mono py-4 text-[11px] text-primary">
                      <span className="border-b border-transparent transition-colors group-hover:border-primary/60">
                        {e.tx}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-6 text-[12px] text-muted-foreground">
          Simulated references. Production deployments resolve these to real settlement
          transactions.
        </p>
      </Shell>
    </Section>
  );
}
