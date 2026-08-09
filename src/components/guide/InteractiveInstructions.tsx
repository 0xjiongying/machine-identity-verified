import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useWallet } from "@/lib/wallet/wallet-state";
import { useLending } from "@/lib/lending-state";
import { deriveTrack2Guide, GUIDE_STEP_LABELS, type GuideSnapshot } from "@/lib/guide/track2-guide";
import { cn } from "@/lib/utils";

const HIDE_KEY = "mt:track2-guide-collapsed";

function ProgressDots({ stepIndex, completed }: { stepIndex: number; completed: boolean[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Track 2 progress">
      {GUIDE_STEP_LABELS.map((label, i) => {
        const done = completed[i];
        const current = i === stepIndex && !done;
        return (
          <li key={label} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span className="text-muted-foreground/40" aria-hidden="true">
                —
              </span>
            ) : null}
            <span
              className={cn(
                "mt-mono inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em]",
                done ? "text-success" : current ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span aria-hidden="true">{done ? "✓" : current ? "●" : "○"}</span>
              <span className="hidden sm:inline">
                {i + 1} {label}
              </span>
              <span className="sm:hidden">{i + 1}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Tip({ term, text }: { term: string; text: string }) {
  return (
    <details className="mt-3 border border-border/70 bg-background/40 px-3 py-2">
      <summary className="mt-mono cursor-pointer text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {term}
      </summary>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{text}</p>
    </details>
  );
}

/**
 * State-aware Track 2 guide — reacts to wallet / CVI / registry / DeFi truth.
 * Collapsible; never fabricates verification or transactions.
 */
export function InteractiveInstructions() {
  const wallet = useWallet();
  const lending = useLending();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(HIDE_KEY) === "1";
  });
  const [machineConfirmed, setMachineConfirmed] = useState(false);

  useEffect(() => {
    // Reset machine confirmation when wallet changes / disconnects
    setMachineConfirmed(false);
  }, [wallet.address]);

  useEffect(() => {
    window.localStorage.setItem(HIDE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const guide: GuideSnapshot = useMemo(
    () =>
      deriveTrack2Guide({
        walletStatus: wallet.status,
        walletAddress: wallet.address,
        onMonadTestnet: wallet.onMonadTestnet,
        usingConnectedWallet: lending.usingConnectedWallet,
        eligibility: lending.eligibility,
        loading: lending.loading,
        acting: lending.acting,
        error: lending.error,
        position: lending.position,
        lastTxHash: lending.lastTxHash,
        lastExplorerUrl: lending.lastExplorerUrl,
        lastAction: lending.lastAction,
        machineConfirmed,
      }),
    [wallet, lending, machineConfirmed],
  );

  // Highlight relevant product surface
  useEffect(() => {
    const key = guide.highlight;
    const nodes = document.querySelectorAll<HTMLElement>("[data-guide-target]");
    nodes.forEach((el) => {
      const match = key && el.dataset["guideTarget"] === key;
      el.dataset["guideActive"] = match ? "true" : "false";
    });
    return () => {
      nodes.forEach((el) => {
        el.dataset["guideActive"] = "false";
      });
    };
  }, [guide.highlight]);

  const runCta = async () => {
    const action = guide.ctaAction;
    if (!action) return;
    if (action === "connect") {
      await wallet.connect();
      return;
    }
    if (action === "switch_network") {
      await wallet.switchNetwork();
      return;
    }
    if (action === "verify_cvi" || action === "retry_cvi") {
      await lending.refresh();
      return;
    }
    if (action === "confirm_machine") {
      setMachineConfirmed(true);
      document.getElementById("defi")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (action === "authorize") {
      // On-chain CVI mapping when eligible; then user can execute
      try {
        await lending.runAuthorizeCvi();
      } catch {
        /* error surfaced in lending.error */
      }
      return;
    }
    if (action === "execute" || action === "retry_tx") {
      await lending.runOpenCredit();
      return;
    }
    if (action === "view_tx" && lending.lastExplorerUrl) {
      window.open(lending.lastExplorerUrl, "_blank", "noopener,noreferrer");
    }
  };

  const stepLabel = `STEP ${guide.stepIndex + 1} OF 6`;

  if (collapsed) {
    return (
      <div className="mb-8 border border-border bg-surface/40 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mt-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Track 2 guide
            </p>
            <p className="mt-1 text-[13px]">
              Next: <span className="text-foreground">{guide.title}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="mt-mono border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] hover:border-foreground"
          >
            Show Guide
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Interactive Track 2 instructions"
      className="mb-8 border border-primary/30 bg-surface/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            Next action · {stepLabel}
          </p>
          <ProgressDots stepIndex={guide.stepIndex} completed={guide.completed} />
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="mt-mono px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          Hide Guide
        </button>
      </div>

      <div className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={guide.phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <h3 className="text-[18px] font-medium tracking-[-0.02em]">{guide.title}</h3>
              <p className="mt-2 max-w-[48ch] text-[13px] leading-relaxed text-muted-foreground">
                {guide.body}
              </p>
              {guide.statusLines?.length ? (
                <ul className="mt-3 space-y-1">
                  {guide.statusLines.map((line) => (
                    <li key={line} className="mt-mono text-[11px] text-muted-foreground">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
              {guide.explanation ? (
                <Tip term={guide.explanation.term} text={guide.explanation.text} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {guide.ctaLabel ? (
            <button
              type="button"
              onClick={() => void runCta()}
              disabled={lending.acting || wallet.status === "connecting"}
              data-cursor="connect"
              className="mt-mono mt-5 border border-primary bg-primary/15 px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
            >
              {guide.ctaLabel}
            </button>
          ) : null}
        </div>

        <aside className="border border-border bg-background/50 px-4 py-4">
          <p className="mt-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Trust chain
          </p>
          <ol className="mt-3 space-y-2 text-[12px] leading-snug">
            <li className={cn(guide.completed[0] ? "text-success" : "text-muted-foreground")}>
              Wallet → operator address
            </li>
            <li
              className={cn(
                guide.completed[1] || guide.stepIndex >= 1
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              CVI → verified identity
            </li>
            <li className={cn(guide.completed[3] ? "text-success" : "text-muted-foreground")}>
              MachineTrustRegistry → authorization
            </li>
            <li className={cn(guide.completed[4] ? "text-success" : "text-muted-foreground")}>
              DeFi eligibility
            </li>
            <li className={cn(guide.completed[5] ? "text-success" : "text-muted-foreground")}>
              Monad Testnet transaction
            </li>
          </ol>
          {wallet.shortAddr ? (
            <p className="mt-mono mt-4 text-[10px] text-muted-foreground">
              Bound wallet {wallet.shortAddr}
              {wallet.onMonadTestnet ? " · Monad ✓" : ""}
            </p>
          ) : (
            <p className="mt-mono mt-4 text-[10px] text-muted-foreground">No wallet connected</p>
          )}
        </aside>
      </div>
    </section>
  );
}
