/**
 * Track 2 — CVI-gated DeFi types.
 *
 * OFF-CHAIN: Cleanverse CVI via POST /query_apass (A-Pass)
 * ON-CHAIN:  MachineTrustRegistry.ownerOf + MachineTrustCredit credit deposit
 *
 * CCP / CVA are Track 1 concerns and are displayed separately when present.
 * Track 2 eligibility is driven by CVI + machine authorization.
 */

export type CVIStatus = "verified" | "unverified" | "pending" | "error";

export type CviGateResult = {
  wallet: string;
  chain: string;
  mode: "demo" | "live";
  status: CVIStatus;
  active: boolean;
  cvRecordId: string | null;
  tier: string | null;
  countries: string[];
  apassStatus: number | string | null;
  envelopeCode: string;
  envelopeMessage: string;
  /** Redacted raw envelope fields for audit (no secrets). */
  raw: {
    code: string;
    message: string;
    hasCvRecordId: boolean;
  };
};

export type MachineAuthResult = {
  machineId: string;
  passportId: string;
  registryAddress: string | null;
  owner: string | null;
  authorized: boolean;
  reason: string;
};

export type EligibilityDecision = {
  decisionId: string;
  wallet: string;
  mode: "demo" | "live";
  eligible: boolean;
  cvi: CviGateResult;
  machine: MachineAuthResult;
  cviRef: string | null;
  notice: string;
  evaluatedAt: string;
  layers: {
    cvi: "VERIFIED" | "UNVERIFIED" | "ERROR" | "PENDING";
    machine: "AUTHORIZED" | "LOCKED" | "UNKNOWN";
    defi: "ELIGIBLE" | "LOCKED";
  };
};

export type CreditPosition = {
  borrower: string;
  machineId: string;
  depositWei: string;
  depositMon: string;
  cviRef: string;
  openedAt: number;
  active: boolean;
  txHash: string | null;
  explorerUrl: string | null;
  contractAddress: string | null;
  kind: "on-chain" | "not-configured";
};

export type CreditActionResult = {
  ok: boolean;
  mode: "demo" | "live";
  eligibility: EligibilityDecision;
  position: CreditPosition | null;
  notice: string;
  error?: string;
  txHash?: string | null;
  explorerUrl?: string | null;
};
