import {
  authorizeCviOnChain,
  getCreditMarketConfig,
  getCreditPosition,
  getTrack2Eligibility,
  openCreditDeposit,
} from "@/lib/lending.functions";
import type { CreditActionResult, CreditPosition, EligibilityDecision } from "@/lib/lending/types";

export type { CreditMarketConfig } from "@/lib/lending/credit.server";

export async function fetchTrack2Eligibility(walletAddress: string): Promise<EligibilityDecision> {
  return getTrack2Eligibility({ data: { walletAddress } });
}

export async function fetchCreditPosition(walletAddress: string): Promise<CreditPosition | null> {
  return getCreditPosition({ data: { walletAddress } });
}

export async function fetchCreditMarketConfig() {
  return getCreditMarketConfig();
}

export async function authorizeCvi(walletAddress: string) {
  return authorizeCviOnChain({ data: { walletAddress } });
}

export async function openCredit(
  walletAddress: string,
  amountMon: string,
): Promise<CreditActionResult> {
  return openCreditDeposit({ data: { walletAddress, amountMon } });
}
