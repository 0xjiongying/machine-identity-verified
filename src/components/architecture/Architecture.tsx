import { useState } from "react";
import { motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";
import { CleanverseMark } from "@/components/brand/CleanverseLogo";
import { cn } from "@/lib/utils";

type NodeKey =
  "mt" | "passport" | "cvi" | "cva" | "ccp" | "block" | "approve" | "monad" | "ownership" | "audit";

const NOTES: Record<NodeKey, string> = {
  mt: "Machine Trust owns the product surface and orchestration — never Cleanverse secrets.",
  passport: "What is the machine? Identity, provenance, maintenance, parts, ownership context.",
  cvi: "Cleanverse Verified Identity — wallet bound to a verified financial identity (A-Pass / query_apass).",
  cva: "Cleanverse Verified Asset — digital value entered via an approved pathway (bound A-Token / aUSDC).",
  ccp: "Programmed Governance via CCP — eligibility on interlocking CVI+CVA before value moves (verify_apass · code 4 only).",
  block: "Invalid participant or failed CCP. Nothing reaches Monad. Ownership unchanged.",
  approve: "CVI + CVA + CCP cleared. Trust established — transaction may execute.",
  monad: "On-chain execution layer. Sandbox UAT records a labelled settlement reference.",
  ownership: "Canonical owner updates only after an approved path.",
  audit: "Continuously traceable records: issue, block, approve, settle, ownership.",
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
        label="CCP · Programmed Governance"
        sub="Cleanverse · verify_apass · code 4 only"
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
            Machine Trust asks what the machine is. Cleanverse Trust Framework interlocking CVI,
            CVA and Programmed Governance (CCP) asks who may act — and whether value may move —
            before issuance, transfer or settlement. Monad executes only after approval; ownership
            and the audit trail follow.
          </Lede>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12">
            <p className="mb-3 flex items-center justify-center gap-2 text-muted-foreground">
              <CleanverseMark className="size-3.5" />
              <span className="mt-mono text-[10px] uppercase tracking-[0.18em]">
                Trust Framework · CVI + CVA + CCP
              </span>
            </p>
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
CCP · PROGRAMMED GOVERNANCE
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
