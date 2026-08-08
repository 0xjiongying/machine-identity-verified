import { motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";
import { auditTrail } from "@/data/demoMachine";

export function AuditTrail() {
  return (
    <Section id="audit" label="Asset history" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="06">Asset history</Eyebrow>
          <Heading>Every state change leaves a trace.</Heading>
          <Lede>
            Registration, service, issuance and transfer accumulate into one auditable record — the proof
            that makes a machine financeable rather than merely photographed.
          </Lede>
        </Reveal>

        <div className="mt-14 overflow-x-auto">
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
              {auditTrail.map((e, i) => (
                <motion.tr
                  key={e.time}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-8% 0px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="border-b border-border last:border-0"
                >
                  <td className="mt-mono py-4 pr-6 text-[11px] text-muted-foreground">{e.time}</td>
                  <td className="py-4 pr-6 text-[13px]">{e.entity}</td>
                  <td className="py-4 pr-6 text-[13px] text-foreground">{e.action}</td>
                  <td className="mt-mono py-4 pr-6 text-[11px] text-success">{e.verification}</td>
                  <td className="mt-mono py-4 text-[11px] text-primary">{e.tx}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-[12px] text-muted-foreground">
          Simulated references. Production deployments resolve these to real settlement transactions.
        </p>
      </Shell>
    </Section>
  );
}
