import { SANDBOX_WALLETS } from "@/data/cleanverse-registry";

export type DemoWalletKey = "unknown" | "borrower" | "lender";

export type DemoWallet = {
  key: DemoWalletKey;
  name: string;
  role: string;
  wallet: string;
  expected: "blocked" | "eligible" | "lender";
};

/** Sandbox-bound demo wallets for Track 2 connect step. */
export const DEMO_WALLETS: DemoWallet[] = [
  {
    key: "unknown",
    name: "Unknown Wallet",
    role: "Unverified borrower",
    wallet: SANDBOX_WALLETS.unknown,
    expected: "blocked",
  },
  {
    key: "borrower",
    name: "ABC Manufacturing",
    role: "Verified operator",
    wallet: SANDBOX_WALLETS.issuer,
    expected: "eligible",
  },
  {
    key: "lender",
    name: "Equipment Fund B",
    role: "Verified lender",
    wallet: SANDBOX_WALLETS.fund,
    expected: "lender",
  },
];
