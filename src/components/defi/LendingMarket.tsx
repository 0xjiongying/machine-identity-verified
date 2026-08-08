import { useEffect, useState } from "react";
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
import { DEMO_WALLETS } from "@/data/lendingWallets";
import { useLending } from "@/lib/lending-state";
import { cn } from "@/lib/utils";
import { demoMachine } from "@/data/demoMachine";

const STAGES = [
  "CONNECT",
  "VERIFY_IDENTITY",
  "ELIGIBLE",
  "ENTER_POOL",
  "REQUEST_LOAN",
  "APPROVE",
  "BORROW",
  "REPAY",
  "CLOSED",
] as const;

function money(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function LendingMarket() {
  const {
    mode,
    deployedAddress,
    connected,
    eligibility,
    checking,
    pool,
    loan,
    stage,
    notice,
    connect,
    disconnect,
    checkEligibility,
    requestLoan,
    activateLoan,
    repayLoan,
  } = useLending();
  const [principal, setPrincipal] = useState(50_000);

  useEffect(() => {
    function onDemo(e: Event) {
      const detail = (e as CustomEvent<{ action: string; wallet?: string }>).detail;
      if (detail.action === "connect" && detail.wallet) {
        const key = detail.wallet as "unknown" | "borrower" | "lender";
        connect(key);
      }
      if (detail.action === "check") void checkEligibility();
      if (detail.action === "request") void requestLoan(principal);
      if (detail.action === "borrow") void activateLoan();
      if (detail.action === "repay") void repayLoan();
    }
    window.addEventListener("mt:lending", onDemo as EventListener);
    return () => window.removeEventListener("mt:lending", onDemo as EventListener);
  });

  const rate = pool ? (pool.interestBps / 100).toFixed(2) : "—";

  return (
    <Section id="finance" label="Machine Finance Pool" className="scroll-mt-16">
      <Shell>
        <Reveal>
          <Eyebrow index="08">Compliant DeFi</Eyebrow>
          <Heading>Machine Finance Pool.</Heading>
          <Lede>
            Verified identity unlocks the market. Cleanverse CVI gates entry; CCP confirms
            eligibility; Monad executes the loan. Unverified wallets never reach the pool.
          </Lede>
          <p className="mt-mono mt-4 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Mode {mode} · API v5.6 ·{" "}
            {deployedAddress
              ? `contract ${deployedAddress.slice(0, 10)}…`
              : "protocol-engine mirror of MachineTrustLending.sol"}
          </p>
          <DemoTag className="mt-5" />
        </Reveal>

        {/* state machine */}
        <Reveal delay={0.08}>
          <ol className="mt-10 flex flex-wrap gap-2">
            {STAGES.map((s) => {
              const active = stage === s || (stage === "BLOCKED" && s === "VERIFY_IDENTITY");
              const blocked = stage === "BLOCKED" && s === "VERIFY_IDENTITY";
              return (
                <li
                  key={s}
                  className={cn(
                    "mt-mono border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em]",
                    blocked
                      ? "border-destructive/50 text-destructive"
                      : active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {s.replaceAll("_", " ")}
                </li>
              );
            })}
            {stage === "BLOCKED" ? (
              <li className="mt-mono border border-destructive/60 bg-destructive/10 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-destructive">
                BLOCKED
              </li>
            ) : null}
          </ol>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          {/* connect + layers */}
          <Reveal>
            <div className="border border-border bg-surface/50">
              <div className="border-b border-border px-5 py-4">
                <p className="mt-label">Connect wallet</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Demo wallets bound to sandbox A-Pass addresses. Selection is the connect step.
                </p>
              </div>
              <ul className="grid gap-2 p-4">
                {DEMO_WALLETS.map((w) => (
                  <li key={w.key}>
                    <button
                      type="button"
                      onClick={() => connect(w.key)}
                      data-cursor="connect"
                      aria-pressed={connected?.key === w.key}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 border px-4 py-3.5 text-left transition-colors",
                        connected?.key === w.key
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-foreground",
                      )}
                    >
                      <span>
                        <span className="mt-label block">{w.role}</span>
                        <span className="mt-1.5 block text-[14px]">{w.name}</span>
                        <span className="mt-mono mt-1 block text-[11px] text-muted-foreground">
                          {w.wallet.slice(0, 12)}…{w.wallet.slice(-4)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-mono text-[10px] uppercase tracking-[0.16em]",
                          w.expected === "blocked" ? "text-destructive" : "text-success",
                        )}
                      >
                        {w.expected}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 border-t border-border px-4 py-4">
                <MagneticButton
                  onClick={() => void checkEligibility()}
                  disabled={!connected || checking}
                  cursor="issue"
                  className="flex-1"
                >
                  {checking ? "Verifying…" : "Check Eligibility"}
                </MagneticButton>
                <button
                  type="button"
                  onClick={disconnect}
                  className="border border-border px-4 py-3 text-[12px] text-muted-foreground hover:border-foreground"
                >
                  Disconnect
                </button>
              </div>

              {/* Cleanverse layers — driven by real eligibility decision */}
              <dl className="grid grid-cols-2 gap-px border-t border-border bg-border">
                {[
                  ["CVI / A-PASS", eligibility?.layers.cvi ?? "—"],
                  ["COMPLIANCE", eligibility?.layers.compliance ?? "—"],
                  ["POOL", eligibility?.layers.pool ?? "LOCKED"],
                  [
                    "LOAN",
                    loan?.status === "active"
                      ? "ACTIVE"
                      : loan?.status === "closed" || loan?.status === "repaid"
                        ? "CLOSED"
                        : loan?.status === "requested"
                          ? "REQUESTED"
                          : "NONE",
                  ],
                  [
                    "MONAD",
                    loan?.settlement
                      ? loan.settlement.kind === "on-chain"
                        ? "SETTLED"
                        : "PROTOCOL REF"
                      : "—",
                  ],
                  ["MODE", mode.toUpperCase()],
                ].map(([k, v]) => {
                  const ok =
                    v === "VERIFIED" ||
                    v === "APPROVED" ||
                    v === "ELIGIBLE" ||
                    v === "ACTIVE" ||
                    v === "SETTLED" ||
                    v === "CLOSED" ||
                    v === "PROTOCOL REF";
                  const bad = v === "UNVERIFIED" || v === "REJECTED" || v === "BLOCKED";
                  return (
                    <div key={k} className="bg-background px-4 py-4">
                      <dt className="mt-label">{k}</dt>
                      <dd
                        className={cn(
                          "mt-mono mt-1.5 flex items-center gap-2 text-[12px]",
                          ok ? "text-success" : bad ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        <StatusDot tone={ok ? "ok" : bad ? "fail" : "neutral"} />
                        {v}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </Reveal>

          {/* pool + loan actions */}
          <Reveal delay={0.1}>
            <div className="border border-border bg-surface/50 p-5 sm:p-7">
              <p className="mt-mono text-[11px] uppercase tracking-[0.16em]">Pool · USDC</p>
              <div className="mt-5 grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                {[
                  ["Total liquidity", pool ? `$${money(pool.totalLiquidity)}` : "—"],
                  ["Available", pool ? `$${money(pool.availableLiquidity)}` : "—"],
                  ["Borrowed", pool ? `$${money(pool.borrowed)}` : "—"],
                  ["Interest", `${rate}%`],
                  ["Duration", pool ? `${pool.durationDays} days` : "—"],
                  ["Max loan", pool ? `$${money(pool.maxLoan)}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-background px-4 py-4">
                    <p className="mt-label">{k}</p>
                    <p className="mt-mono mt-1.5 text-[13px]">{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-mono mt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Protocol-config values · not third-party TVL · {pool?.marketId}
              </p>

              <div className="mt-6 border border-border bg-background px-4 py-4">
                <p className="mt-label">Machine context</p>
                <p className="mt-2 text-[14px]">{demoMachine.model}</p>
                <p className="mt-mono mt-1 text-[11px] text-muted-foreground">
                  {demoMachine.id} · ref value {demoMachine.valuation} · passport context only — not
                  automatic on-chain collateral
                </p>
              </div>

              <AnimatePresence mode="wait">
                {eligibility && !eligibility.eligible ? (
                  <motion.div
                    key="blocked"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 border border-destructive/60 p-5"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-destructive">
                      Access denied · CVI gate
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                      {eligibility.notice}
                    </p>
                    <p className="mt-mono mt-3 text-[11px] text-muted-foreground">
                      {eligibility.cvi
                        ? `query_apass ${eligibility.cvi.envelopeCode} · active=${eligibility.cvi.active}`
                        : "no CVI result"}
                      {eligibility.ccp ? ` · verify_apass data.code ${eligibility.ccp.code}` : ""}
                    </p>
                  </motion.div>
                ) : null}

                {eligibility?.eligible && !loan ? (
                  <motion.div
                    key="eligible"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-primary/40 bg-primary/10 p-5"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                      Pool unlocked · request financing
                    </p>
                    <label className="mt-4 block">
                      <span className="mt-label">Loan principal (USDC)</span>
                      <input
                        type="number"
                        min={1000}
                        max={pool?.maxLoan ?? 80000}
                        step={1000}
                        value={principal}
                        onChange={(e) => setPrincipal(Number(e.target.value))}
                        className="mt-2 w-full border border-border bg-background px-3 py-2 text-[14px]"
                      />
                    </label>
                    <p className="mt-mono mt-2 text-[11px] text-muted-foreground">
                      Interest due ≈ $
                      {money(Math.round((principal * (pool?.interestBps ?? 800)) / 10_000))} ·{" "}
                      {pool?.durationDays ?? 90} days
                    </p>
                    <MagneticButton
                      className="mt-4 w-full"
                      onClick={() => void requestLoan(principal)}
                      cursor="transfer"
                    >
                      Request Financing
                    </MagneticButton>
                  </motion.div>
                ) : null}

                {loan?.status === "requested" ? (
                  <motion.div
                    key="requested"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-border p-5"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.18em]">
                      Loan requested · approve borrow
                    </p>
                    <p className="mt-3 text-[14px]">
                      ${money(loan.principal)} + ${money(loan.interestDue)} interest
                    </p>
                    <MagneticButton
                      className="mt-4 w-full"
                      onClick={() => void activateLoan()}
                      cursor="transfer"
                    >
                      Approve & Borrow
                    </MagneticButton>
                  </motion.div>
                ) : null}

                {loan?.status === "active" ? (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-primary/50 bg-primary/10 p-5"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                      Loan ACTIVE
                    </p>
                    <p className="mt-3 text-[14px]">
                      Borrowed ${money(loan.principal)} · repay $
                      {money(loan.principal + loan.interestDue)}
                    </p>
                    <p className="mt-mono mt-2 break-all text-[11px] text-muted-foreground">
                      {loan.settlement?.txRef} · {loan.settlement?.kind}
                    </p>
                    <MagneticButton
                      className="mt-4 w-full"
                      onClick={() => void repayLoan()}
                      cursor="transfer"
                    >
                      Repay Loan
                    </MagneticButton>
                  </motion.div>
                ) : null}

                {loan?.status === "closed" || loan?.status === "repaid" ? (
                  <motion.div
                    key="closed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 border border-success/40 p-5"
                  >
                    <p className="mt-mono text-[11px] uppercase tracking-[0.2em] text-success">
                      Loan CLOSED · repaid
                    </p>
                    <p className="mt-mono mt-2 break-all text-[11px] text-muted-foreground">
                      {loan.settlement?.txRef}
                    </p>
                    <p className="mt-3 text-[12px] text-muted-foreground">
                      {loan.settlement?.note}
                    </p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {notice ? (
                <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">{notice}</p>
              ) : null}

              <div className="mt-6 border-t border-border pt-4">
                <p className="mt-label">Separation of concerns</p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  OFF-CHAIN COMPLIANCE: Cleanverse <code>query_apass</code> +{" "}
                  <code>verify_apass</code> (data.code 4). ON-CHAIN LOAN EXECUTION:{" "}
                  <code>MachineTrustLending</code> eligibility mapping + borrow/repay. API secrets
                  never enter the contract.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
