import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseEther } from "viem";
import { evaluateTrack2Eligibility } from "@/lib/lending/eligibility.server";
import {
  applyCviEligibilityOnChain,
  getCreditConfig,
  openCreditDepositOnChain,
  readCreditPosition,
  type CreditMarketConfig,
} from "@/lib/lending/credit.server";
import type {
  CreditActionResult,
  CreditPosition,
  EligibilityDecision,
} from "@/lib/lending/types";

const walletSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const openCreditSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amountMon: z.string().min(1),
});

export const getTrack2Eligibility = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => walletSchema.parse(data))
  .handler(async ({ data }): Promise<EligibilityDecision> => {
    return evaluateTrack2Eligibility(data.walletAddress);
  });

export const authorizeCviOnChain = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => walletSchema.parse(data))
  .handler(
    async ({
      data,
    }): Promise<{ ok: boolean; txHash: string | null; notice: string; eligibility: EligibilityDecision }> => {
      const eligibility = await evaluateTrack2Eligibility(data.walletAddress);
      if (eligibility.cvi.status !== "verified" || !eligibility.cvi.active) {
        throw new Error(
          eligibility.notice ||
            "CVI not verified — cannot authorize on MachineTrustCredit",
        );
      }
      if (!eligibility.machine.authorized) {
        throw new Error(
          eligibility.notice ||
            "MachineTrustRegistry ownership required before CVI authorization",
        );
      }
      const write = await applyCviEligibilityOnChain(eligibility);
      if (!write.ok) {
        throw new Error(write.notice);
      }
      return { ...write, eligibility };
    },
  );

export const openCreditDeposit = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => openCreditSchema.parse(data))
  .handler(async ({ data }): Promise<CreditActionResult> => {
    const eligibility = await evaluateTrack2Eligibility(data.walletAddress);
    if (!eligibility.eligible) {
      return {
        ok: false,
        mode: eligibility.mode,
        eligibility,
        position: null,
        notice: eligibility.notice,
        error: "DeFi blocked: CVI verified + machine authorized required",
        txHash: null,
        explorerUrl: null,
      };
    }

    const authorize = await applyCviEligibilityOnChain(eligibility);
    if (!authorize.ok) {
      return {
        ok: false,
        mode: eligibility.mode,
        eligibility,
        position: null,
        notice: authorize.notice,
        error: authorize.notice,
        txHash: null,
        explorerUrl: null,
      };
    }

    let amountWei: bigint;
    try {
      amountWei = parseEther(data.amountMon);
    } catch {
      return {
        ok: false,
        mode: eligibility.mode,
        eligibility,
        position: null,
        notice: "Invalid MON amount",
        error: "Invalid MON amount",
        txHash: null,
        explorerUrl: null,
      };
    }
    if (amountWei <= 0n) {
      return {
        ok: false,
        mode: eligibility.mode,
        eligibility,
        position: null,
        notice: "Amount must be > 0",
        error: "Amount must be > 0",
        txHash: null,
        explorerUrl: null,
      };
    }

    const write = await openCreditDepositOnChain(eligibility, amountWei);
    return {
      ok: write.ok,
      mode: eligibility.mode,
      eligibility,
      position: write.position,
      notice: write.ok ? write.reason : write.reason,
      error: write.ok ? undefined : write.reason,
      txHash: write.txHash,
      explorerUrl: write.position?.explorerUrl ?? null,
    };
  });

export const getCreditPosition = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => walletSchema.parse(data))
  .handler(async ({ data }): Promise<CreditPosition | null> => {
    return readCreditPosition(data.walletAddress);
  });

export const getCreditMarketConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<CreditMarketConfig> => getCreditConfig(),
);
