import { monadTestnetAddressUrl, monadTestnetTxUrl, isLikelyTxHash } from "@/lib/monad/explorer";
import type { Evaluation } from "@/lib/cleanverse-adapter";
import { cn } from "@/lib/utils";

/**
 * Cleanverse gate + Monad Testnet proof panel for silent demos.
 * Only shows explorer links for real on-chain settlements.
 */
export function SettlementProof({ result, className }: { result: Evaluation; className?: string }) {
  const cviOk = result.rules.filter((r) => r.source === "CVI").every((r) => r.status !== "fail");
  const cvaOk = result.rules.filter((r) => r.source === "CVA").every((r) => r.status !== "fail");
  const ccpOk =
    result.approved && result.rules.some((r) => r.source === "CCP" && r.status === "pass");
  const onChain = result.settlement?.kind === "on-chain" && isLikelyTxHash(result.settlement.txRef);
  const registry = result.settlement?.registryAddress;
  const owner = result.settlement?.ownerAddress;
  const explorer =
    result.settlement?.explorerUrl ??
    (onChain && result.settlement?.txRef ? monadTestnetTxUrl(result.settlement.txRef) : null);

  return (
    <div className={cn("border border-border", className)}>
      <p className="mt-label border-b border-border px-4 py-2.5">Execution proof</p>
      <div className="grid gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <section className="px-4 py-3">
          <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Cleanverse
          </p>
          <ul className="mt-2 space-y-1.5 font-mono text-[12px]">
            <li className={cviOk ? "text-primary" : "text-destructive"}>CVI {cviOk ? "✓" : "×"}</li>
            <li className={cvaOk ? "text-primary" : "text-destructive"}>CVA {cvaOk ? "✓" : "×"}</li>
            <li className={ccpOk ? "text-primary" : "text-destructive"}>CCP {ccpOk ? "✓" : "×"}</li>
          </ul>
          <p className="mt-mono mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Mode {result.mode}
            {result.degraded ? " · degraded" : ""}
          </p>
        </section>
        <section className="px-4 py-3">
          <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Monad Testnet
          </p>
          {onChain ? (
            <div className="mt-2 space-y-2 font-mono text-[11px] leading-relaxed">
              <p>
                MachineTrustRegistry
                {registry ? (
                  <>
                    <br />
                    <a
                      className="text-primary underline-offset-2 hover:underline"
                      href={monadTestnetAddressUrl(registry)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {registry}
                    </a>
                  </>
                ) : (
                  <span className="text-muted-foreground"> · address pending in settlement</span>
                )}
              </p>
              <p>
                Transaction
                <br />
                <a
                  className="text-primary underline-offset-2 hover:underline"
                  href={explorer ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.settlement?.txRef}
                </a>
                <span className="ml-2 text-primary">Confirmed</span>
              </p>
              {owner ? (
                <p>
                  Ownership
                  <br />
                  <a
                    className="text-primary underline-offset-2 hover:underline"
                    href={monadTestnetAddressUrl(owner)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {owner}
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              {result.approved
                ? "CCP approved off-chain. No confirmed Monad Testnet explorer hash for this run (registry write skipped or DEMO settlement ref)."
                : "No Monad transaction — Cleanverse gate did not APPROVE."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
