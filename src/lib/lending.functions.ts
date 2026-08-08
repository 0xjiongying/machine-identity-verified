import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { resolveMode } from "./cleanverse/service.server";
import { evaluateBorrowerEligibility } from "./lending/eligibility.server";
import {
  activateLoan,
  getPool,
  listLoansFor,
  repayLoan,
  requestLoan,
  setEligibleOnChain,
  supplyLiquidity,
} from "./lending/protocol.server";

const walletSchema = z.object({
  wallet: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

export const getLendingMode = createServerFn({ method: "GET" }).handler(async () => ({
  mode: resolveMode(),
  apiVersion: "v5.6" as const,
  track: "track-2-compliant-defi" as const,
  contract: "contracts/MachineTrustLending.sol",
  deployedAddress: process.env["MACHINE_TRUST_LENDING_ADDRESS"]?.trim() || null,
}));

export const getPoolSnapshot = createServerFn({ method: "GET" }).handler(async () => getPool());

export const checkEligibility = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => walletSchema.parse(data))
  .handler(async ({ data }) => {
    const decision = await evaluateBorrowerEligibility(data.wallet);
    // Mirror Solidity setBorrowerEligible — only after Cleanverse gates.
    const write = setEligibleOnChain(data.wallet, decision);
    return {
      ...decision,
      protocolWrite: write,
    };
  });

export const supplyToPool = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        wallet: z.string().min(8),
        amount: z.number().positive().max(1_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => supplyLiquidity(data.amount, data.wallet));

export const createLoanRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        wallet: z.string().min(8),
        borrowerName: z.string().min(1),
        principal: z.number().positive(),
        passportId: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // Re-check Cleanverse before loan request — never trust a stale UI flag alone.
    const decision = await evaluateBorrowerEligibility(data.wallet);
    setEligibleOnChain(data.wallet, decision);
    if (!decision.eligible) {
      return {
        ok: false as const,
        error: "CVI/CCP gate blocked loan request",
        pool: getPool(),
        loan: null,
        eligibility: decision,
        notice: decision.notice,
        mode: decision.mode,
      };
    }
    const result = requestLoan({
      wallet: data.wallet,
      borrowerName: data.borrowerName,
      principal: data.principal,
      passportId: data.passportId,
    });
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error,
        pool: result.pool,
        loan: null,
        eligibility: decision,
        notice: result.error,
        mode: decision.mode,
      };
    }
    return {
      ok: true as const,
      pool: result.pool,
      loan: result.loan,
      eligibility: decision,
      notice: "Loan requested — activate to borrow from the pool.",
      mode: decision.mode,
      error: undefined,
    };
  });

export const approveBorrow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ wallet: z.string().min(8), loanId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const decision = await evaluateBorrowerEligibility(data.wallet);
    setEligibleOnChain(data.wallet, decision);
    if (!decision.eligible) {
      return {
        ok: false as const,
        error: "Eligibility revoked or failed before borrow",
        pool: getPool(),
        loan: null,
        eligibility: decision,
        notice: decision.notice,
        mode: decision.mode,
      };
    }
    const result = activateLoan(data.loanId, data.wallet);
    return {
      ...result,
      eligibility: decision,
      mode: decision.mode,
      notice: result.ok ? result.notice : result.error,
    };
  });

export const repayBorrow = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ wallet: z.string().min(8), loanId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const result = repayLoan(data.loanId, data.wallet);
    return {
      ...result,
      mode: resolveMode(),
      notice: result.ok ? result.notice : result.error,
      eligibility: null,
    };
  });

export const getBorrowerLoans = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => walletSchema.parse(data))
  .handler(async ({ data }) => ({
    pool: getPool(),
    loans: listLoansFor(data.wallet),
  }));
