import { motion } from "motion/react";
import { FlowPulse, TiltCard } from "@/components/motion/Kinetic";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal, StatusDot } from "@/components/primitives";
import { issuer, recipients, type Participant } from "@/data/demoParticipants";

function Node({
  role,
  name,
  cvi,
  note,
}: {
  role: string;
  name: string;
  cvi: boolean;
  note: string;
}) {
  return (
    <TiltCard className="border border-border bg-surface/50 p-5" strength={5}>
      <p className="mt-label">{role}</p>
      <p className="mt-2 text-lg font-medium tracking-tight">{name}</p>
      <p className="mt-2 text-[12px] text-muted-foreground">{note}</p>
      <p
        className={`mt-mono mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] ${cvi ? "text-success" : "text-destructive"}`}
      >
        <StatusDot tone={cvi ? "ok" : "fail"} /> CVI {cvi ? "verified" : "not verified"}
      </p>
    </TiltCard>
  );
}

export function Participants() {
  const fundB = recipients[1] as Participant;
  return (
    <Section id="participants" label="Verified participants" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="05">Verified participants</Eyebrow>
          <Heading>The asset is only half the trust equation.</Heading>
          <Lede>
            Knowing what a machine is does not make a transaction legitimate. Cleanverse answers the
            other half: who is allowed to participate, and whether this specific transaction may
            proceed.
          </Lede>
        </Reveal>

        <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <Reveal>
            <Node role={issuer.role} name={issuer.name} cvi={issuer.cvi} note={issuer.note} />
          </Reveal>

          <Reveal delay={0.15} className="flex items-center justify-center">
            <div className="relative flex h-24 w-full items-center justify-center lg:h-40 lg:w-24">
              <motion.svg
                viewBox="0 0 96 160"
                className="absolute inset-0 h-full w-full text-border"
                aria-hidden="true"
              >
                <motion.path
                  d="M48 4 L48 156"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.circle
                  cx="48"
                  r="3"
                  fill="var(--primary)"
                  initial={{ cy: 10, opacity: 0 }}
                  whileInView={{ cy: [10, 150], opacity: [0, 1, 0] }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, repeatDelay: 1.4 }}
                />
                <FlowPulse d="M48 4 L48 156" duration={2.4} />
                <FlowPulse d="M48 4 L48 156" duration={2.4} delay={1.2} className="text-success" />
              </motion.svg>
              <span className="mt-mono absolute left-1/2 top-0 -translate-x-1/2 bg-background px-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                CVI
              </span>
              <span className="mt-mono absolute bottom-0 left-1/2 -translate-x-1/2 bg-background px-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                CVA
              </span>
              <span className="mt-mono relative bg-background px-2 text-[10px] uppercase tracking-[0.2em] text-primary">
                Cleanverse
              </span>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <Node role={fundB.role} name={fundB.name} cvi={fundB.cvi} note={fundB.note} />
          </Reveal>
        </div>

        <Reveal delay={0.3}>
          <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-3">
            {[
              ["Machine Trust", "What is the asset?"],
              ["Cleanverse", "Who can transact?"],
              ["Trusted transaction", "Both conditions satisfied"],
            ].map(([k, v], i) => (
              <div key={k} className="bg-background px-5 py-6">
                <p className={`mt-label ${i === 2 ? "text-primary" : ""}`}>{k}</p>
                <p className="mt-2 text-[14px]">{v}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </Shell>
    </Section>
  );
}
