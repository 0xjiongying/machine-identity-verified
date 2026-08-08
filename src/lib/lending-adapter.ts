/**
 * LendingAdapter — UI boundary for Track 2 Compliant DeFi.
 * Browser never holds Cleanverse credentials.
 */

import {
  approveBorrow,
  checkEligibility,
  createLoanRequest,
  getLendingMode,
  getPoolSnapshot,
  repayBorrow,
  supplyToPool,
} from "./lending.functions";
import type {
  EligibilityDecision,
  LendingActionResult,
  LoanRecord,
  PoolSnapshot,
} from "./lending/types";

export type { EligibilityDecision, LendingActionResult, LoanRecord, PoolSnapshot };

export async function fetchLendingMode() {
  try {
    return (await getLendingMode()) as Awaited<ReturnType<typeof getLendingMode>>;
  } catch {
    return {
      mode: "demo" as const,
      apiVersion: "v5.6" as const,
      track: "track-2-compliant-defi" as const,
      contract: "contracts/MachineTrustLending.sol",
      deployedAddress: null,
    };
  }
}

export async function fetchPool(): Promise<PoolSnapshot> {
  try {
    return (await getPoolSnapshot()) as PoolSnapshot;
  } catch {
    return {
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
  }
}

export async function requestEligibility(wallet: string): Promise<EligibilityDecision> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("eligibility: transport timeout")), 9000),
  );
  try {
    const result = (await Promise.race([
      checkEligibility({ data: { wallet } }),
      timeout,
    ])) as EligibilityDecision & { protocolWrite?: { ok: boolean; notice: string } };
    if (result.protocolWrite?.notice) {
      return {
        ...result,
        notice: `${result.notice} ${result.protocolWrite.notice}`,
      };
    }
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "transport failure";
    return {
      decisionId: "mt:elig/degraded",
      wallet,
      mode: "demo",
      status: "unavailable",
      eligible: false,
      cvi: null,
      ccp: null,
      complianceRef: null,
      notice: `Degraded: ${reason}. Fail closed — lending access not granted.`,
      evaluatedAt: new Date().toISOString(),
      layers: { cvi: "UNAVAILABLE", compliance: "UNAVAILABLE", pool: "LOCKED" },
    };
  }
}

export async function requestFinancing(input: {
  wallet: string;
  borrowerName: string;
  principal: number;
  passportId: string;
}): Promise<LendingActionResult> {
  try {
    const res = (await createLoanRequest({ data: input })) as LendingActionResult;
    return res;
  } catch (error) {
    return {
      ok: false,
      mode: "demo",
      pool: await fetchPool(),
      loan: null,
      eligibility: null,
      notice: "Loan request failed",
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

export async function confirmBorrow(wallet: string, loanId: string): Promise<LendingActionResult> {
  try {
    const res = (await approveBorrow({ data: { wallet, loanId } })) as {
      ok: boolean;
      loan: LoanRecord | null;
      pool: PoolSnapshot;
      notice?: string;
      error?: string;
      mode: "demo" | "live";
      eligibility: EligibilityDecision | null;
    };
    return {
      ok: res.ok,
      mode: res.mode,
      pool: res.pool,
      loan: res.loan,
      eligibility: res.eligibility,
      notice: res.notice ?? "",
      ...(res.error ? { error: res.error } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      mode: "demo",
      pool: await fetchPool(),
      loan: null,
      eligibility: null,
      notice: "Borrow activation failed",
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

export async function confirmRepay(wallet: string, loanId: string): Promise<LendingActionResult> {
  try {
    const res = (await repayBorrow({ data: { wallet, loanId } })) as {
      ok: boolean;
      loan: LoanRecord | null;
      pool: PoolSnapshot;
      notice?: string;
      error?: string;
      mode: "demo" | "live";
    };
    return {
      ok: res.ok,
      mode: res.mode,
      pool: res.pool,
      loan: res.loan,
      eligibility: null,
      notice: res.notice ?? "",
      ...(res.error ? { error: res.error } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      mode: "demo",
      pool: await fetchPool(),
      loan: null,
      eligibility: null,
      notice: "Repayment failed",
      error: error instanceof Error ? error.message : "unknown",
    };
  }
}

export async function lenderSupply(wallet: string, amount: number) {
  return supplyToPool({ data: { wallet, amount } });
}
