import { useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";
import { VerifiedMonadProof } from "@/components/compliance/SettlementProof";
import { auditTrail } from "@/data/demoMachine";
import { useAssetState } from "@/lib/asset-state";
import {
  MACHINE_TRUST_REGISTRY_DEPLOYMENT,
  isLikelyTxHash,
  monadTestnetTxUrl,
} from "@/lib/monad/explorer";

type AuditRow = {
  time: string;
  entity: string;
  action: string;
  verification: string;
  tx: string;
  href?: string;
};

export function AuditTrail() {
  const { extraEvents, owner } = useAssetState();
  const list = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: list,
    offset: ["start 80%", "end 60%"],
  });
  // The provenance line draws itself as the history scrolls past.
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 });

  const onChainProof: AuditRow[] = [
    {
      time: MACHINE_TRUST_REGISTRY_DEPLOYMENT.proofAt,
      entity: "Issuer → Registry",
      action: "Machine Registered (Monad Testnet)",
      verification: "CVI · CVA · CCP → Monad",
      tx: MACHINE_TRUST_REGISTRY_DEPLOYMENT.registrationTx,
      href: MACHINE_TRUST_REGISTRY_DEPLOYMENT.explorers.registrationTx,
    },
    {
      time: MACHINE_TRUST_REGISTRY_DEPLOYMENT.proofAt,
      entity: "Equipment Fund B",
      action: "Ownership Updated (Monad Testnet)",
      verification: "CVI · CVA · CCP → Monad",
      tx: MACHINE_TRUST_REGISTRY_DEPLOYMENT.ownershipTransferTx,
      href: MACHINE_TRUST_REGISTRY_DEPLOYMENT.explorers.ownershipTransferTx,
    },
  ];

  const rows: AuditRow[] = [
    ...auditTrail.map((e): AuditRow => ({ ...e })),
    ...onChainProof,
    ...extraEvents.map((e): AuditRow => {
      const row: AuditRow = {
        time: e.timestamp,
        entity: e.kind === "transferred" ? owner : "Machine Trust",
        action: e.label,
        verification:
          e.kind === "issued" || e.kind === "transferred" || e.kind === "verified"
            ? "CVI · CVA · CCP"
            : "Machine Trust",
        tx: e.hash,
      };
      if (isLikelyTxHash(e.hash)) row.href = monadTestnetTxUrl(e.hash);
      return row;
    }),
  ];

  return (
    <Section id="audit" label="Asset history" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="10">Asset history</Eyebrow>
          <Heading>Every state change leaves a trace.</Heading>
          <Lede>
            Registration and service start as Machine Trust passport events. Issuance and transfer
            appear only after Cleanverse CVI → CVA → CCP gates approve — never pre-settled.
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
                {rows.map((e, i) => (
                  <motion.tr
                    key={`${e.time}-${e.tx}-${i}`}
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
                      {e.href ? (
                        <a
                          className="border-b border-transparent transition-colors group-hover:border-primary/60 underline-offset-2 hover:underline"
                          href={e.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {e.tx}
                        </a>
                      ) : (
                        <span className="border-b border-transparent transition-colors group-hover:border-primary/60">
                          {e.tx}
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-8">
          <VerifiedMonadProof className="border border-border" />
        </div>
        <p className="mt-6 text-[12px] text-muted-foreground">
          Passport rows are demo metadata. Cleanverse-gated Monad Testnet register/transfer rows are
          explorer-confirmed (MonadVision). Settlement refs without explorer hashes are labelled
          demo-only.
        </p>
      </Shell>
    </Section>
  );
}
