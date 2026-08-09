import { useEffect } from "react";
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
import { MagneticButton } from "@/components/motion/MagneticButton";
import { LENDING_WALLETS, type LendingWalletId } from "@/data/lendingWallets";
import { useLending } from "@/lib/lending-state";
import { useWallet } from "@/lib/wallet/wallet-state";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";
import { InteractiveInstructions } from "@/components/guide/InteractiveInstructions";
import { cn } from "@/lib/utils";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function LayerRow({
  label,
  value,
  ok,
  locked,
  guideTarget,
}: {
  label: string;
  value: string;
  ok?: boolean;
  locked?: boolean;
  guideTarget?: string;
}) {
  return (
    <div
      className="bg-background px-4 py-4 transition-[box-shadow]"
      data-guide-target={guideTarget}
    >
      <dt className="mt-label">{label}</dt>
      <dd
        className={cn(
          "mt-mono mt-1.5 flex items-center gap-2 text-[12px]",
          ok ? "text-success" : locked ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <StatusDot tone={ok ? "ok" : locked ? "fail" : "neutral"} />
        {value}
      </dd>
    </div>
  );
}

export function LendingMarket() {
  const wallet = useWallet();
  const {
    selectedWalletId,
    setSelectedWalletId,
    walletAddress,
    usingConnectedWallet,
    eligibility,
    position,
    config,
    amountMon,
    setAmountMon,
    loading,
    acting,
    error,
    lastTxHash,
    lastExplorerUrl,
    lastAction,
    refresh,
    runAuthorizeCvi,
    runOpenCredit,
  } = useLending();

  useEffect(() => {
    function onDemo(e: Event) {
      const detail = (e as CustomEvent<{ action: string; wallet?: LendingWalletId }>).detail;
      if (!detail?.action) return;
      if (detail.action === "select" && detail.wallet && detail.wallet in LENDING_WALLETS) {
        // Demo sandbox path only when no live wallet is connected
        if (!wallet.address) setSelectedWalletId(detail.wallet);
      }
      if (detail.action === "refresh") void refresh();
      if (detail.action === "attempt") void runOpenCredit();
      if (detail.action === "connect") void wallet.connect();
    }
    window.addEventListener("mt:defi", onDemo as EventListener);
    return () => window.removeEventListener("mt:defi", onDemo as EventListener);
  }, [setSelectedWalletId, refresh, runOpenCredit, wallet]);

  const cviOk = eligibility?.layers.cvi === "VERIFIED";
  const machineOk = eligibility?.layers.machine === "AUTHORIZED";
  const defiOk = eligibility?.layers.defi === "ELIGIBLE";

  return (
    <Section id="defi" label="CVI-gated DeFi" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="10">Cleanverse Track 2</Eyebrow>
          <Heading>CVI-gated credit deposit.</Heading>
          <Lede>
            Cleanverse CVI verifies identity. MachineTrustRegistry authorizes the machine. Only then
            can a real Monad Testnet credit deposit open. Unverified wallets are rejected on-chain.
          </Lede>
          <p className="mt-mono mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            CVI → MachineTrustRegistry → MachineTrustCredit · Monad chain {config?.chainId ?? 10143}
            {config?.creditAddress
              ? ` · ${shortAddr(config.creditAddress)}`
              : " · credit contract pending deploy"}
          </p>
          <DemoTag className="mt-5" />
        </Reveal>

        <div className="mt-10">
          <InteractiveInstructions />
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          <Reveal>
            <div className="border border-border bg-surface/50">
              <div
                className="border-b border-border px-5 py-4 transition-[box-shadow,border-color]"
                data-guide-target="wallet"
              >
                <p className="mt-label">Operator wallet</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Connect a real wallet. CVI uses that address via Cleanverse{" "}
                  <code>query_apass</code> — never a mock.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <WalletConnectButton />
                  {usingConnectedWallet ? (
                    <span className="mt-mono text-[10px] uppercase tracking-[0.14em] text-success">
                      Bound to connected wallet
                    </span>
                  ) : (
                    <span className="mt-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      Sandbox demo path until you connect
                    </span>
                  )}
                </div>
                {wallet.status === "wrong_network" ? (
                  <p className="mt-3 text-[12px] text-destructive">
                    Connected on the wrong network. Switch to Monad Testnet (chain 10143).
                  </p>
                ) : null}
              </div>

              {!usingConnectedWallet ? (
                <ul className="grid gap-2 p-4">
                  {(Object.keys(LENDING_WALLETS) as LendingWalletId[]).map((id) => {
                    const w = LENDING_WALLETS[id];
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => setSelectedWalletId(id)}
                          data-cursor="connect"
                          aria-pressed={selectedWalletId === id}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 border px-4 py-3.5 text-left transition-colors",
                            selectedWalletId === id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-foreground",
                          )}
                        >
                          <span>
                            <span className="mt-label block">{w.role}</span>
                            <span className="mt-1.5 block text-[14px]">{w.label}</span>
                            <span className="mt-mono mt-1 block text-[11px] text-muted-foreground">
                              {shortAddr(w.address)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "mt-mono text-[10px] uppercase tracking-[0.16em]",
                              id === "unknown" ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {id === "unknown"
                              ? "negative"
                              : id === "verifiedBuyer"
                                ? "owner"
                                : "cvi"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="border-b border-border px-5 py-4">
                  <p className="mt-label">Connected operator</p>
                  <p className="mt-mono mt-2 break-all text-[12px]">{walletAddress}</p>
                  <p className="mt-mono mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Network · Monad Testnet {wallet.onMonadTestnet ? "✓" : "— switch required"}
                  </p>
                </div>
              )}

              <div className="flex gap-2 border-t border-border px-4 py-4">
                <MagneticButton
                  onClick={() => void refresh()}
                  disabled={loading}
                  cursor="issue"
                  className="flex-1"
                >
                  {loading ? "Checking CVI…" : "Refresh CVI + Auth"}
                </MagneticButton>
              </div>

              <div
                className="border-t border-border px-5 py-4 transition-[box-shadow,border-color]"
                data-guide-target="cvi"
              >
                <p className="mt-label">Cleanverse Identity</p>
                <p className="mt-mono mt-2 text-[11px] text-muted-foreground">
                  Operator {shortAddr(walletAddress)}
                  {usingConnectedWallet ? " · live wallet" : " · sandbox"}
                </p>
              </div>

              <dl
                className="grid grid-cols-2 gap-px border-t border-border bg-border"
                data-guide-target="eligibility"
              >
                <LayerRow
                  label="CVI"
                  value={
                    eligibility
                      ? eligibility.layers.cvi === "VERIFIED"
                        ? "✓ VERIFIED"
                        : eligibility.layers.cvi === "ERROR"
                          ? "ERROR"
                          : "✗ NOT VERIFIED"
                      : loading
                        ? "…"
                        : "—"
                  }
                  ok={cviOk}
                  locked={Boolean(eligibility && !cviOk)}
                />
                <LayerRow
                  label="Machine"
                  guideTarget="machine"
                  value={eligibility ? eligibility.machine.passportId : (config?.passportId ?? "—")}
                />
                <LayerRow
                  label="Machine Trust"
                  guideTarget="trust"
                  value={eligibility ? (machineOk ? "✓ AUTHORIZED" : "LOCKED") : "—"}
                  ok={machineOk}
                  locked={Boolean(eligibility && !machineOk)}
                />
                <LayerRow
                  label="DeFi Eligibility"
                  value={eligibility ? (defiOk ? "✓ ELIGIBLE" : "LOCKED") : "—"}
                  ok={defiOk}
                  locked={Boolean(eligibility && !defiOk)}
                />
              </dl>

              {eligibility && !defiOk ? (
                <div className="border-t border-border px-5 py-4">
                  <p className="mt-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
                    Reason
                  </p>
                  <p className="mt-2 text-[13px] text-muted-foreground">{eligibility.notice}</p>
                  <p className="mt-mono mt-2 text-[10px] text-muted-foreground">
                    query_apass {eligibility.cvi.envelopeCode} · mode {eligibility.mode} · active=
                    {String(eligibility.cvi.active)}
                  </p>
                </div>
              ) : null}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="border border-border bg-surface/50 p-5 sm:p-7">
              <p className="mt-mono text-[11px] uppercase tracking-[0.16em]">
                MachineTrustCredit · MON deposit
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                On-chain gate: <code>cviEligible[borrower]</code> AND{" "}
                <code>registry.ownerOf(machineId) == borrower</code>. Oracle-only writes so a direct
                contract call cannot bypass Cleanverse CVI.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-px bg-border">
                {[
                  ["Registry", config?.registryAddress ? shortAddr(config.registryAddress) : "—"],
                  ["Credit", config?.creditAddress ? shortAddr(config.creditAddress) : "not set"],
                  ["Machine ID", config?.machineId ? shortAddr(config.machineId) : "—"],
                  ["Position", position?.active ? `${position.depositMon} MON` : "none"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background px-4 py-4">
                    <p className="mt-label">{k}</p>
                    <p className="mt-mono mt-1.5 break-all text-[12px]">{v}</p>
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {defiOk ? (
                  <motion.div
                    key="eligible"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-primary/40 bg-primary/10 p-5"
                    data-guide-target="execute"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                      Stake / credit deposit enabled
                    </p>
                    <label className="mt-4 block">
                      <span className="mt-label">Amount (MON)</span>
                      <input
                        type="text"
                        value={amountMon}
                        onChange={(e) => setAmountMon(e.target.value)}
                        className="mt-2 w-full border border-border bg-background px-3 py-2 text-[14px]"
                      />
                    </label>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <MagneticButton
                        onClick={() => void runAuthorizeCvi()}
                        disabled={acting || !config?.configured}
                        cursor="issue"
                      >
                        {acting ? "Working…" : "Authorize CVI on-chain"}
                      </MagneticButton>
                      <MagneticButton
                        onClick={() => void runOpenCredit()}
                        disabled={acting || !config?.configured || Boolean(position?.active)}
                        cursor="transfer"
                      >
                        {position?.active
                          ? "Position open"
                          : acting
                            ? "Submitting…"
                            : "Open Credit Deposit"}
                      </MagneticButton>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="locked"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-destructive/60 p-5"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-destructive">
                      DeFi action locked
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                      {eligibility?.notice ??
                        "Verified identity required. Connect a CVI-verified machine owner."}
                    </p>
                    <MagneticButton
                      className="mt-4 w-full"
                      onClick={() => void runOpenCredit()}
                      disabled={acting}
                      cursor="transfer"
                    >
                      Attempt deposit (expect reject)
                    </MagneticButton>
                  </motion.div>
                )}
              </AnimatePresence>

              {error ? (
                <p className="mt-5 border border-destructive/40 px-4 py-3 text-[12px] text-destructive">
                  {error}
                </p>
              ) : null}

              {lastTxHash ? (
                <div className="mt-6 border border-success/40 p-5" data-guide-target="tx">
                  <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-success">
                    Transaction proof
                  </p>
                  <dl className="mt-3 space-y-2 text-[12px]">
                    <div>
                      <dt className="mt-label">Action</dt>
                      <dd className="mt-mono mt-1">{lastAction}</dd>
                    </div>
                    <div>
                      <dt className="mt-label">Transaction</dt>
                      <dd className="mt-mono mt-1 break-all">
                        {lastExplorerUrl ? (
                          <a
                            href={lastExplorerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:text-foreground"
                          >
                            {lastTxHash}
                          </a>
                        ) : (
                          lastTxHash
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="mt-label">Network</dt>
                      <dd className="mt-mono mt-1">Monad Testnet</dd>
                    </div>
                    <div>
                      <dt className="mt-label">Contract</dt>
                      <dd className="mt-mono mt-1 break-all">{config?.creditAddress ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="mt-label">Status</dt>
                      <dd className="mt-mono mt-1 text-success">Confirmed</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              <div className="mt-6 border-t border-border pt-4">
                <p className="mt-label">Track 1 CCP remains separate</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  Issuer/fund CCP ComplianceFailed states are not rewritten for Track 2. Track 2
                  requires CVI <em>or</em> CVA — this flow uses CVI only.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
