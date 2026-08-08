import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Section,
  Shell,
  Eyebrow,
  Heading,
  Lede,
  Reveal,
  StatusDot,
  DemoTag,
} from "@/components/primitives";
import {
  demoMachine,
  ownershipHistory,
  maintenanceLog,
  machineParts,
  type MachinePart,
} from "@/data/demoMachine";
import { cn } from "@/lib/utils";
import { useAssetState } from "@/lib/asset-state";

const tabs = ["Overview", "Ownership", "Maintenance", "Parts", "Provenance", "Compliance"] as const;
type Tab = (typeof tabs)[number];

const panel = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
};

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3.5">
      <span className="mt-label min-w-0 shrink">{k}</span>
      <span
        className={cn(
          "mt-mono min-w-0 break-words text-right text-[12px]",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {v}
      </span>
    </div>
  );
}

export function Passport() {
  const { owner, previousOwner } = useAssetState();
  const [tab, setTab] = useState<Tab>("Overview");
  const [part, setPart] = useState<MachinePart>(machineParts[1] as MachinePart);

  return (
    <Section id="passport" label="Machine Passport">
      <Shell>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
          <Reveal>
            <Eyebrow index="02">Machine Passport</Eyebrow>
            <Heading>One machine. One persistent identity.</Heading>
            <Lede>
              The passport is the machine&apos;s canonical record: what it is, who owns it, how it
              has been serviced, which parts it carries, and every event that changed its state.
            </Lede>
            <div className="mt-8 space-y-0">
              <Row k="Machine ID" v={demoMachine.id} accent />
              <Row k="Serial" v={demoMachine.serial} />
              <Row k="Manufacturer" v={demoMachine.manufacturer} />
              <Row k="Status" v={demoMachine.status} />
              <Row k="Current owner" v={owner} accent={Boolean(previousOwner)} />
              {previousOwner ? <Row k="Previous owner" v={previousOwner} /> : null}
            </div>
            <DemoTag className="mt-6" />
          </Reveal>

          <Reveal delay={0.12}>
            <div className="border border-border bg-surface/50">
              <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
                <p className="mt-mono text-[11px] tracking-[0.16em] text-foreground">
                  {demoMachine.model}
                </p>
                <span className="mt-mono flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-success">
                  <StatusDot tone="ok" /> Verified
                </span>
              </div>

              <div
                role="tablist"
                aria-label="Machine passport sections"
                className="flex snap-x gap-1 overflow-x-auto border-b border-border px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {tabs.map((t) => (
                  <button
                    key={t}
                    role="tab"
                    id={`tab-${t}`}
                    aria-selected={tab === t}
                    aria-controls={`panel-${t}`}
                    onClick={() => setTab(t)}
                    data-cursor="inspect"
                    className={cn(
                      "mt-mono relative shrink-0 snap-start px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition-colors",
                      tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab === t ? (
                      <motion.span
                        layoutId="passport-tab"
                        className="absolute inset-0 border border-primary/50 bg-primary/10"
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      />
                    ) : null}
                    <span className="relative">{t}</span>
                  </button>
                ))}
              </div>

              <div className="min-h-[380px] p-5 sm:p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    role="tabpanel"
                    id={`panel-${tab}`}
                    aria-labelledby={`tab-${tab}`}
                    {...panel}
                  >
                    {tab === "Overview" ? (
                      <div className="grid gap-px bg-border sm:grid-cols-2">
                        {[
                          ["Model", demoMachine.model],
                          ["Category", demoMachine.category],
                          ["Commissioned", demoMachine.commissioned],
                          ["Location", demoMachine.location],
                          ["Indicative value", demoMachine.valuation],
                          ["Provenance events", String(demoMachine.provenanceEvents)],
                        ].map(([k, v]) => (
                          <div key={k} className="bg-background px-4 py-5">
                            <p className="mt-label">{k}</p>
                            <p className="mt-2 text-[14px]">{v}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {tab === "Ownership" ? (
                      <ol className="relative pl-6">
                        <span
                          className="absolute left-[3px] top-2 bottom-2 w-px bg-border"
                          aria-hidden="true"
                        />
                        {ownershipHistory.map((o, i) => (
                          <motion.li
                            key={o.year + o.entity}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="relative pb-8 last:pb-0"
                          >
                            <span className="absolute -left-6 top-1.5 size-[7px] rounded-full bg-primary" />
                            <p className="mt-label">{o.year}</p>
                            <p className="mt-1.5 text-[15px]">{o.entity}</p>
                            <p className="mt-1 text-[13px] text-muted-foreground">{o.action}</p>
                            <p className="mt-mono mt-2 text-[11px] text-muted-foreground">
                              {o.ref} · <span className="text-success">verified</span>
                            </p>
                          </motion.li>
                        ))}
                      </ol>
                    ) : null}

                    {tab === "Maintenance" ? (
                      <table className="w-full text-left">
                        <caption className="mt-label mb-3 text-left">
                          Service record — simulated
                        </caption>
                        <tbody>
                          {maintenanceLog.map((m, i) => (
                            <motion.tr
                              key={m.date}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08, duration: 0.45 }}
                              className="border-b border-border last:border-0"
                            >
                              <td className="mt-mono py-3.5 pr-4 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                                {m.date}
                              </td>
                              <td className="py-3.5 pr-4 text-[13px]">{m.work}</td>
                              <td className="py-3.5 pr-4 text-[12px] text-muted-foreground">
                                {m.tech}
                              </td>
                              <td className="mt-mono py-3.5 text-right text-[11px] tracking-[0.16em] text-success">
                                {m.result}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}

                    {tab === "Parts" ? (
                      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
                        <ul className="flex gap-2 sm:flex-col">
                          {machineParts.map((p) => (
                            <li key={p.key}>
                              <button
                                onClick={() => setPart(p)}
                                data-cursor="inspect"
                                aria-pressed={part.key === p.key}
                                className={cn(
                                  "mt-mono w-full border px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] transition-colors",
                                  part.key === p.key
                                    ? "border-primary text-primary"
                                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
                                )}
                              >
                                {p.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <AnimatePresence mode="wait">
                          <motion.dl key={part.key} {...panel} className="grid gap-px bg-border">
                            {[
                              ["Part ID", part.partId],
                              ["Installation date", part.installed],
                              ["Manufacturer", part.manufacturer],
                              ["Maintenance status", part.maintenance],
                              ["Replacement history", part.replacements],
                            ].map(([k, v]) => (
                              <div key={k} className="bg-background px-4 py-3.5">
                                <dt className="mt-label">{k}</dt>
                                <dd className="mt-1.5 text-[13px]">{v}</dd>
                              </div>
                            ))}
                          </motion.dl>
                        </AnimatePresence>
                      </div>
                    ) : null}

                    {tab === "Provenance" ? (
                      <div className="space-y-0">
                        <Row k="Registration" v="2025-03-11 · ABC Manufacturing" />
                        <Row k="Service events" v="4 signed records" />
                        <Row k="Part replacements" v="1 (motor, 2026-02)" />
                        <Row k="Issuance" v="2026-08-04 · RWA issued" accent />
                        <Row k="Transfers" v="1 compliant transfer" />
                        <Row k="Total events" v={`${demoMachine.provenanceEvents} events`} />
                      </div>
                    ) : null}

                    {tab === "Compliance" ? (
                      <div className="space-y-0">
                        <Row k="Asset credential (CVA)" v="ATTESTED" accent />
                        <Row k="Owner credential (CVI)" v="VERIFIED" accent />
                        <Row k="Transfer policy" v="MT-TRF-02" />
                        <Row k="Eligible counterparties" v="CVI-verified only" />
                        <Row k="Settlement network" v="Monad" />
                        <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
                          Compliance state is evaluated through the Cleanverse adapter. In this
                          prototype the adapter runs in demo mode; production credentials resolve
                          through the same interface.
                        </p>
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
