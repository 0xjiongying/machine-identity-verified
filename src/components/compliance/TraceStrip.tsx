import type { Evaluation } from "@/lib/cleanverse-adapter";
import { cn } from "@/lib/utils";

/**
 * The three Cleanverse primitives behind one decision, made traceable:
 * CVI (A-Pass) → CVA (A-Token) → CCP decision → Monad execution.
 */
export function TraceStrip({ result, className }: { result: Evaluation; className?: string }) {
  const rows: Array<{ tag: string; label: string; value: string; ok: boolean }> = [
    {
      tag: "CVI",
      label: result.kind === "issuance" ? "Issuer A-Pass" : "Holder A-Pass",
      value: result.trace.cvi.senderRef ?? "unresolved",
      ok: Boolean(result.trace.cvi.senderRef),
    },
    ...(result.kind === "transfer"
      ? [
          {
            tag: "CVI",
            label: "Recipient A-Pass",
            value: result.trace.cvi.recipientRef ?? "unresolved",
            ok: Boolean(result.trace.cvi.recipientRef),
          },
        ]
      : []),
    {
      tag: "CVA",
      label: "A-Token",
      value: result.trace.cva.tokenRef
        ? `${result.trace.cva.tokenId} · ${result.trace.cva.tokenRef}`
        : `${result.trace.cva.tokenId ?? "—"} · not minted`,
      ok: Boolean(result.trace.cva.tokenRef),
    },
    {
      tag: "CCP",
      label: "Pre-transaction decision",
      value: `${result.trace.ccp.decisionRef} · ${result.approved ? "allow" : "deny"}`,
      ok: result.approved,
    },
    {
      tag: "MONAD",
      label: "Execution",
      value: result.settlement?.txRef ?? "not submitted",
      ok: Boolean(result.settlement),
    },
  ];

  return (
    <div className={cn("border border-border", className)}>
      <p className="mt-label border-b border-border px-4 py-2.5">Cleanverse trace</p>
      <ul className="divide-y divide-border">
        {rows.map((r, i) => (
          <li key={`${r.tag}-${i}`} className="flex items-start gap-3 px-4 py-3">
            <span
              className={cn(
                "mt-mono shrink-0 border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em]",
                r.ok ? "text-primary" : "text-destructive",
              )}
            >
              {r.tag}
            </span>
            <span className="min-w-0">
              <span className="mt-mono block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {r.label}
              </span>
              <span className="mt-mono mt-1 block break-all text-[11px]">{r.value}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-mono border-t border-border px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        ruleset {result.trace.ccp.rulesetId} · mode {result.mode}
      </p>
      {result.notice ? (
        <p className="border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          {result.notice}
        </p>
      ) : null}
    </div>
  );
}