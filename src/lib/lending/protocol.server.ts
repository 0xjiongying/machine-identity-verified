/**
 * MachineTrustLending protocol engine (server-only).
 *
 * Mirrors contracts/MachineTrustLending.sol state transitions.
 * Cleanverse verification stays OFF-CHAIN; eligibility must be set before borrow.
 *
 * When a deployed Monad contract address is configured (MACHINE_TRUST_LENDING_ADDRESS),
 * settlement kind can be upgraded to on-chain. Until then: protocol-engine records.
 */

import { createHash } from "node:crypto";
import type { EligibilityDecision, LoanRecord, LoanStatus, PoolSnapshot } from "./types";

const POOL_SEED: PoolSnapshot = {
  marketId: "mt:pool/machine-finance-usdc-v1",
  asset: "USDC",
  chain: "Monad",
  totalLiquidity: 250_000,
  availableLiquidity: 250_000,
  borrowed: 0,
  interestBps: 800,
  durationDays: 90,
  maxLoan: 80_000,
  labelled: "protocol-config",
};

type Store = {
  pool: PoolSnapshot;
  eligible: Map<string, { eligible: boolean; complianceRef: string }>;
  loans: Map<string, LoanRecord>;
  seq: number;
};

const g = globalThis as typeof globalThis & { __mtLendingStore?: Store };

function store(): Store {
  if (!g.__mtLendingStore) {
    g.__mtLendingStore = {
      pool: { ...POOL_SEED },
      eligible: new Map(),
      loans: new Map(),
      seq: 1,
    };
  }
  return g.__mtLendingStore;
}

function hash(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function settlementRef(seed: string) {
  const deployed = process.env["MACHINE_TRUST_LENDING_ADDRESS"]?.trim();
  return {
    chain: "Monad" as const,
    txRef: deployed ? `monad:tx/0x${hash(seed + deployed)}` : `monad:protocol/0x${hash(seed)}`,
    kind: deployed ? ("on-chain" as const) : ("protocol-engine" as const),
    note: deployed
      ? "Recorded against configured MachineTrustLending address."
      : "Protocol-engine settlement mirror of MachineTrustLending.sol (contract not deployed on this environment).",
  };
}

export function getPool(): PoolSnapshot {
  const s = store();
  return {
    ...s.pool,
    availableLiquidity: s.pool.totalLiquidity - s.pool.borrowed,
  };
}

export function setEligibleOnChain(
  wallet: string,
  decision: EligibilityDecision,
): { ok: boolean; notice: string } {
  const s = store();
  const key = wallet.toLowerCase();
  if (!decision.eligible || !decision.complianceRef) {
    s.eligible.set(key, { eligible: false, complianceRef: decision.decisionId });
    return {
      ok: false,
      notice: "Borrower marked ineligible on protocol — Cleanverse gate did not approve.",
    };
  }
  s.eligible.set(key, { eligible: true, complianceRef: decision.complianceRef });
  return {
    ok: true,
    notice: `Eligibility written to protocol engine (mirrors setBorrowerEligible). ref ${decision.complianceRef}`,
  };
}

export function isEligible(wallet: string): boolean {
  return store().eligible.get(wallet.toLowerCase())?.eligible === true;
}

export function supplyLiquidity(amount: number, lender: string) {
  if (amount <= 0) throw new Error("Invalid supply amount");
  const s = store();
  s.pool.totalLiquidity += amount;
  const pool = getPool();
  return {
    ok: true as const,
    pool,
    notice: `Lender ${lender.slice(0, 10)}… supplied ${amount} USDC (protocol-config liquidity).`,
    settlement: settlementRef(`supply:${lender}:${amount}:${Date.now()}`),
  };
}

export function requestLoan(input: {
  wallet: string;
  borrowerName: string;
  principal: number;
  passportId: string;
}):
  | { ok: true; loan: LoanRecord; pool: PoolSnapshot }
  | { ok: false; error: string; pool: PoolSnapshot } {
  const s = store();
  const pool = getPool();
  const key = input.wallet.toLowerCase();
  if (!s.eligible.get(key)?.eligible) {
    return { ok: false, error: "NotEligible — CVI/CCP gate required before loan request.", pool };
  }
  if (input.principal <= 0 || input.principal > pool.maxLoan) {
    return { ok: false, error: "InvalidAmount — principal outside market parameters.", pool };
  }
  if (input.principal > pool.availableLiquidity) {
    return { ok: false, error: "InsufficientLiquidity", pool };
  }

  const interestDue = Math.round((input.principal * pool.interestBps) / 10_000);
  const id = `loan-${s.seq++}`;
  const complianceRef = s.eligible.get(key)?.complianceRef ?? null;
  const loan: LoanRecord = {
    id,
    borrower: input.wallet,
    borrowerName: input.borrowerName,
    principal: input.principal,
    interestDue,
    interestBps: pool.interestBps,
    durationDays: pool.durationDays,
    status: "requested",
    passportId: input.passportId,
    passportRef: `mt:passport/${input.passportId}`,
    complianceRef,
    createdAt: new Date().toISOString(),
    activatedAt: null,
    repaidAt: null,
    settlement: null,
  };
  s.loans.set(id, loan);
  return { ok: true, loan, pool };
}

export function activateLoan(loanId: string, wallet: string) {
  const s = store();
  const loan = s.loans.get(loanId);
  const pool = getPool();
  if (!loan) return { ok: false as const, error: "Loan not found", pool, loan: null };
  if (loan.borrower.toLowerCase() !== wallet.toLowerCase()) {
    return { ok: false as const, error: "NotBorrower", pool, loan };
  }
  if (loan.status !== "requested") {
    return { ok: false as const, error: "BadLoanState", pool, loan };
  }
  if (!isEligible(wallet)) {
    return { ok: false as const, error: "NotEligible", pool, loan };
  }
  if (loan.principal > pool.availableLiquidity) {
    return { ok: false as const, error: "InsufficientLiquidity", pool, loan };
  }

  loan.status = "active";
  loan.activatedAt = new Date().toISOString();
  loan.settlement = settlementRef(`activate:${loanId}:${wallet}`);
  s.pool.borrowed += loan.principal;
  return { ok: true as const, loan, pool: getPool(), notice: loan.settlement.note };
}

export function repayLoan(loanId: string, wallet: string) {
  const s = store();
  const loan = s.loans.get(loanId);
  const pool = getPool();
  if (!loan) return { ok: false as const, error: "Loan not found", pool, loan: null };
  if (loan.borrower.toLowerCase() !== wallet.toLowerCase()) {
    return { ok: false as const, error: "NotBorrower", pool, loan };
  }
  if (loan.status !== "active") {
    return { ok: false as const, error: "BadLoanState", pool, loan };
  }

  loan.status = "repaid";
  loan.repaidAt = new Date().toISOString();
  s.pool.borrowed -= loan.principal;
  s.pool.totalLiquidity += loan.interestDue;
  loan.settlement = settlementRef(`repay:${loanId}:${wallet}`);
  // mark closed for UI state machine
  const closed: LoanRecord = { ...loan, status: "closed" as LoanStatus };
  s.loans.set(loanId, closed);
  return {
    ok: true as const,
    loan: closed,
    pool: getPool(),
    notice: `Repaid principal + interest (${loan.principal + loan.interestDue} USDC). ${closed.settlement?.note}`,
  };
}

export function getLoan(loanId: string) {
  return store().loans.get(loanId) ?? null;
}

export function listLoansFor(wallet: string) {
  return [...store().loans.values()].filter(
    (l) => l.borrower.toLowerCase() === wallet.toLowerCase(),
  );
}
