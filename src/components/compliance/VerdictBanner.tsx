import { cn } from "@/lib/utils";
import type { Evaluation } from "@/lib/cleanverse-adapter";

/**
 * Large, narration-free CCP verdict — readable in a silent demo video.
 */
export function VerdictBanner({ result }: { result: Evaluation }) {
  const ccp = result.rules.filter((r) => r.source === "CCP");
  const codes = ccp
    .map((r) => {
      const m = r.observed.match(/data\.code\s+(\d+)/i);
      return m?.[1] ?? null;
    })
    .filter(Boolean);
  const codeLabel = codes.length ? codes.map((c) => `code ${c}`).join(" · ") : "CCP";

  if (result.approved) {
    return (
      <div className="border border-primary/50 bg-primary/10 px-4 py-4">
        <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
          verify_apass · {codeLabel} · APPROVED
        </p>
        <p className="mt-2 text-[13px] text-foreground">
          CCP gate passed. {result.kind === "issuance" ? "RWA may issue." : "Transfer may settle."}
        </p>
        {result.settlement ? (
          <p className="mt-mono mt-2 break-all text-[11px] text-muted-foreground">
            MONAD · {result.settlement.kind === "demo-settlement-ref" ? "settlement ref" : "tx"} ·{" "}
            {result.settlement.txRef}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border border-destructive/60 bg-destructive/10 px-4 py-4">
      <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-destructive">
        verify_apass · {codeLabel || result.blockedBy} · BLOCKED
      </p>
      <p className="mt-2 text-[13px] text-foreground">
        Compliance rejected. Nothing submitted to Monad. Ownership unchanged.
      </p>
      <p className="mt-mono mt-2 text-[11px] text-muted-foreground">
        HTTP 200 ≠ approval · only data.code 4 allows
      </p>
    </div>
  );
}

export function LayerStrip({
  cvi,
  cva,
  ccp,
  monad,
}: {
  cvi: "pass" | "fail" | "pending";
  cva: "pass" | "fail" | "pending";
  ccp: "pass" | "fail" | "pending";
  monad: "pass" | "fail" | "pending" | "skipped";
}) {
  const cells: Array<[string, string]> = [
    ["CVI", cvi],
    ["CVA", cva],
    ["CCP", ccp],
    ["MONAD", monad],
  ];
  return (
    <ul className="mt-3 grid grid-cols-4 gap-1">
      {cells.map(([k, v]) => (
        <li
          key={k}
          className={cn(
            "mt-mono border px-2 py-2 text-center text-[10px] uppercase tracking-[0.14em]",
            v === "pass" && "border-success/40 text-success",
            v === "fail" && "border-destructive/50 text-destructive",
            (v === "pending" || v === "skipped") && "border-border text-muted-foreground",
          )}
        >
          {k}
          <span className="mt-1 block">
            {v === "pass" ? "✓" : v === "fail" ? "✕" : v === "skipped" ? "—" : "…"}
          </span>
        </li>
      ))}
    </ul>
  );
}
