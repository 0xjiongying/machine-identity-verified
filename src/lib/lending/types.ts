/**
 * Track 2 Compliant DeFi — Machine Finance Pool types.
 *
 * OFF-CHAIN: Cleanverse CVI (query_apass) + CCP (verify_apass data.code 4)
 * ON-CHAIN:  MachineTrustLending loan state machine (or protocol engine mirror)
 */

export type BorrowerRole = "unverified" | "verified-borrower" | "lender";

export type EligibilityStatus =
  "disconnected" | "checking" | "blocked" | "verified" | "eligible" | "unavailable";

export type LoanStatus = "none" | "requested" | "active" | "repaid" | "closed";

export type FinancingVisual = "restricted" | "enabled" | "active" | "closed";

export type CviGateResult = {
  wallet: string;
  chain: string;
  mode: "demo" | "live";
  active: boolean;
  cvRecordId: string | null;
  tier: string | null;
  countries: string[];
  status: number | string | null;
  envelopeCode: string;
  envelopeMessage: string;
  magickLink: string | null;
};

export type CcpGateResult = {
  allowed: boolean;
  code: string;
  reason: string;
  atoken: string | null;
  envelopeCode: string;
};

export type EligibilityDecision = {
  decisionId: string;
  wallet: string;
  mode: "demo" | "live";
  status: EligibilityStatus;
  eligible: boolean;
  cvi: CviGateResult | null;
  ccp: CcpGateResult | null;
  complianceRef: string | null;
  notice: string;
  evaluatedAt: string;
  /** Distinct layers for UI — each maps to real logic. */
  layers: {
    cvi: "UNVERIFIED" | "VERIFIED" | "UNAVAILABLE";
    compliance: "PENDING" | "APPROVED" | "REJECTED" | "UNAVAILABLE";
    pool: "LOCKED" | "ELIGIBLE" | "BLOCKED";
  };
};

export type PoolSnapshot = {
  /** Demo-configured market params — not fabricated third-party TVL. */
  marketId: string;
  asset: "USDC";
  chain: "Monad";
  totalLiquidity: number;
  availableLiquidity: number;
  borrowed: number;
  interestBps: number;
  durationDays: number;
  maxLoan: number;
  labelled: "protocol-config";
};

export type LoanRecord = {
  id: string;
  borrower: string;
  borrowerName: string;
  principal: number;
  interestDue: number;
  interestBps: number;
  durationDays: number;
  status: LoanStatus;
  passportId: string;
  passportRef: string;
  complianceRef: string | null;
  createdAt: string;
  activatedAt: string | null;
  repaidAt: string | null;
  settlement: {
    chain: "Monad";
    txRef: string;
    kind: "protocol-engine" | "on-chain";
    note: string;
  } | null;
};

export type LendingActionResult = {
  ok: boolean;
  mode: "demo" | "live";
  pool: PoolSnapshot;
  loan: LoanRecord | null;
  eligibility: EligibilityDecision | null;
  notice: string;
  error?: string | undefined;
};
