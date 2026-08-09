/**
 * Cleanverse sandbox wallets used for Track 2 CVI-gated DeFi demo.
 * CVI status is always resolved live via query_apass — never hardcoded.
 */
export const LENDING_WALLETS = {
  /** Fund B — current MachineTrustRegistry owner; CVI A-Pass active in sandbox */
  verifiedBuyer: {
    id: "verifiedBuyer" as const,
    label: "Fund B / Verified Buyer",
    address: "0xC8bA032092cC2499637f4E331E841ab24d1c9964",
    role: "Machine owner (sandbox)",
  },
  /** Issuer — has CVI A-Pass but is NOT the current machine owner */
  issuer: {
    id: "issuer" as const,
    label: "Issuer",
    address: "0x5d6b84e2CaB95b72Ed74fB4768324763f4950d9E",
    role: "CVI holder (not machine owner)",
  },
  /** Unknown — no A-Pass; negative path for Track 2 */
  unknown: {
    id: "unknown" as const,
    label: "Unknown Wallet",
    address: "0xDA45b2481b679B6A2Eacb413FdCf761Ab1637D2e",
    role: "No CVI A-Pass",
  },
} as const;

export type LendingWalletId = keyof typeof LENDING_WALLETS;
