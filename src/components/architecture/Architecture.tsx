import { useState } from "react";
import { motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";
import { cn } from "@/lib/utils";

type NodeKey =
  "mt" | "passport" | "cvi" | "cva" | "ccp" | "block" | "approve" | "monad" | "ownership" | "audit";

const NOTES: Record<NodeKey, string> = {
  mt: "Machine Trust owns the product surface and orchestration — never Cleanverse secrets.",
  passport: "What is the machine? Identity, provenance, maintenance, parts, ownership context.",
  cvi: "Who may participate? Active A-Pass via POST /query_apass. Fail → stop.",
  cva: "What is the asset? Registered A-Token bound for compliance (aUSDC on Monad).",
  ccp: "May the transaction proceed? POST /verify_apass — only data.code 4 approves.",
  block: "Invalid participant or failed CCP. Nothing reaches Monad. Ownership unchanged.",
  approve: "CVI + CVA + CCP cleared. Transaction may execute.",
  monad: "On-chain execution layer. Sandbox UAT records a labelled settlement reference.",
  ownership: "Canonical owner updates only after an approved path.",
  audit: "Immutable event trail: issue, block, approve, settle, ownership.",
};

function Arrow() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <span className="mt-mono text-[12px] text-primary">▼</span>
    </div>
  );
}

function Node({
  id,
  label,
  sub,
  active,
  tone = "default",
  onFocus,
}: {
  id: NodeKey;
  label: string;
  sub?: string;
  active: boolean;
  tone?: "default" | "ok" | "fail" | "accent";
  onFocus: (id: NodeKey) => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onFocus(id)}
      onFocus={() => onFocus(id)}
      onClick={() => onFocus(id)}
      data-cursor="inspect"
      className={cn(
        "mx-auto w-full max-w-md border px-4 py-3 text-center transition-colors",
        tone === "fail" && "border-destructive/50",
        tone === "ok" && "border-success/40",
        tone === "accent" && "border-primary/40",
        tone === "default" && "border-border",
        active ? "bg-surface" : "bg-background hover:bg-surface/60",
      )}
    >
      <span
        className={cn(
          "mt-mono block text-[11px] uppercase tracking-[0.18em]",
          tone === "fail" && "text-destructive",
          tone === "ok" && "text-success",
          tone === "accent" && "text-primary",
          tone === "default" && (active ? "text-primary" : "text-foreground"),
        )}
      >
        {label}
      </span>
      {sub ? <span className="mt-1 block text-[11px] text-muted-foreground">{sub}</span> : null}
    </button>
  );
}

/**
 * Canonical Track 1 flow — the judge's mental model, interactive.
 */
function FlowDiagram({ active, onFocus }: { active: NodeKey; onFocus: (k: NodeKey) => void }) {
  return (
    <div className="border border-border bg-surface/30 px-4 py-8 sm:px-8">
      <Node
        id="mt"
        label="Machine Trust"
        active={active === "mt"}
        onFocus={onFocus}
        tone="accent"
      />
      <Arrow />
      <Node
        id="passport"
        label="Machine Passport"
        active={active === "passport"}
        onFocus={onFocus}
      />
      <Arrow />

      <div className="mx-auto grid w-full max-w-md grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        <Node id="cvi" label="CVI / A-Pass" active={active === "cvi"} onFocus={onFocus} />
        <div className="flex items-center justify-center" aria-hidden="true">
          <span className="mt-mono text-[10px] text-muted-foreground">+</span>
        </div>
        <Node id="cva" label="CVA / A-Token" active={active === "cva"} onFocus={onFocus} />
      </div>
      <Arrow />

      <Node
        id="ccp"
        label="CCP / Compliance"
        sub="verify_apass · data.code 4 only"
        active={active === "ccp"}
        onFocus={onFocus}
        tone="accent"
      />
      <Arrow />

      <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-2">
        <Node id="block" label="Block" active={active === "block"} onFocus={onFocus} tone="fail" />
        <Node
          id="approve"
          label="Approve"
          active={active === "approve"}
          onFocus={onFocus}
          tone="ok"
        />
      </div>

      <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-2">
        <div />
        <div>
          <Arrow />
          <Node
            id="monad"
            label="Monad"
            sub="execution · settlement"
            active={active === "monad"}
            onFocus={onFocus}
          />
          <Arrow />
          <Node
            id="ownership"
            label="Ownership update"
            active={active === "ownership"}
            onFocus={onFocus}
          />
          <Arrow />
          <Node id="audit" label="Audit trail" active={active === "audit"} onFocus={onFocus} />
        </div>
      </div>

      <motion.p
        key={active}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-8 max-w-md text-center text-[13px] leading-relaxed text-muted-foreground"
      >
        {NOTES[active]}
      </motion.p>
    </div>
  );
}

export function Architecture() {
  const [active, setActive] = useState<NodeKey>("ccp");

  return (
    <Section id="architecture" label="Architecture" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="11">Architecture</Eyebrow>
          <Heading>One path. Two outcomes.</Heading>
          <Lede>
            Machine Trust asks what the machine is. Cleanverse asks who may act and whether the
            transaction may proceed. Monad executes only after approval — then ownership and the
            audit trail update.
          </Lede>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12">
            <FlowDiagram active={active} onFocus={setActive} />
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <pre
            aria-hidden="true"
            className="mt-mono mt-8 overflow-x-auto border border-border bg-background p-4 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]"
          >{`MACHINE TRUST
       │
       ▼
MACHINE PASSPORT
       │
┌──────┴──────┐
▼             ▼
CVI / A-PASS  CVA / A-TOKEN
│             │
└──────┬──────┘
       ▼
CCP / COMPLIANCE
       │
 ┌─────┴─────┐
 ▼           ▼
BLOCK      APPROVE
               │
               ▼
            MONAD
               │
               ▼
      OWNERSHIP UPDATE
               │
               ▼
          AUDIT TRAIL`}</pre>
        </Reveal>
      </Shell>
    </Section>
  );
}
