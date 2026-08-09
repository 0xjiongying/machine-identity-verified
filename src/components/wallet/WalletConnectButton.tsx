import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet/wallet-state";
import { MONAD_TESTNET } from "@/lib/monad/explorer";
import { cn } from "@/lib/utils";

/**
 * Compact header wallet control — never covers the machine hero.
 */
export function WalletConnectButton({ className }: { className?: string }) {
  const {
    status,
    address,
    shortAddr,
    onMonadTestnet,
    error,
    connect,
    disconnect,
    switchNetwork,
    retry,
  } = useWallet();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (status === "connecting") {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "mt-mono border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground",
          className,
        )}
      >
        Connecting…
      </button>
    );
  }

  if (status === "switching") {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "mt-mono border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground",
          className,
        )}
      >
        Switching…
      </button>
    );
  }

  if (status === "wrong_network" && address) {
    return (
      <div ref={rootRef} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => void switchNetwork()}
          data-cursor="connect"
          className="mt-mono border border-destructive/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-destructive transition-colors hover:border-destructive"
        >
          Switch to Monad Testnet
        </button>
        {error ? (
          <p className="absolute right-0 top-full z-50 mt-1 w-56 border border-border bg-background px-2 py-1.5 text-[10px] text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div ref={rootRef} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => void retry()}
          data-cursor="connect"
          className="mt-mono border border-destructive/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-destructive transition-colors hover:border-destructive"
        >
          Retry Connection
        </button>
        {error ? (
          <p className="absolute right-0 top-full z-50 mt-1 w-56 border border-border bg-background px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status === "connected" && address && shortAddr) {
    return (
      <div ref={rootRef} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          data-cursor="connect"
          aria-expanded={open}
          className="mt-mono border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:border-primary"
        >
          {shortAddr}
        </button>
        {open ? (
          <div className="absolute right-0 top-full z-50 mt-1 w-[220px] border border-border bg-background/95 p-3 shadow-lg backdrop-blur-md">
            <p className="mt-label">Wallet</p>
            <p className="mt-mono mt-1 break-all text-[11px]">{address}</p>
            <p className="mt-mono mt-3 text-[10px] uppercase tracking-[0.14em] text-success">
              {MONAD_TESTNET.networkName} {onMonadTestnet ? "✓" : ""}
            </p>
            <button
              type="button"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="mt-mono mt-3 w-full border border-border px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-foreground hover:text-foreground"
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void connect()}
      data-cursor="connect"
      className={cn(
        "mt-mono border border-border px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-primary hover:text-primary",
        className,
      )}
    >
      Connect Wallet
    </button>
  );
}
