/**
 * Cleanverse Track 1 primitive types.
 *
 * CVI  — Cleanverse Verified Identity (A-Pass): who is allowed to act.
 * CVA  — Cleanverse Verified Asset  (A-Token): what the asset is and what it allows.
 * CCP  — Cleanverse Compliance Protocol: the pre-transaction decision that
 *        gates every issuance and transfer before Monad execution.
 *
 * Machine Trust owns the passport / provenance / maintenance / ownership.
 * Cleanverse owns identity, asset verification and pre-transaction rules.
 * Monad owns execution.
 */

import type { CvaCredential, CviCredential } from "@/data/cleanverse-registry";

export type { CvaCredential, CviCredential };

export type RuleSource = "CVI" | "CVA" | "CCP" | "MONAD";
export type RuleStatus = "pass" | "fail" | "skipped";

export type RuleResult = {
  code: string;
  label: string;
  requirement: string;
  observed: string;
  status: RuleStatus;
  reason: string;
  source: RuleSource;
};

export type PolicyKind = "issuance" | "transfer";

/** A-Pass verification result returned by the CVI service. */
export type ApassVerification = {
  ref: string;
  did: string;
  verified: boolean;
  kycTier: number;
  jurisdiction: string;
  accreditation: string;
  status: string;
};

/** A-Token record returned by the CVA service (bound at issuance). */
export type AtokenRecord = {
  ref: string;
  tokenId: string;
  credentialId: string;
  passportId: string;
  /** bound = registered A-Token linked; minted reserved for true custom launch ISSUED. */
  status: "bound" | "minted" | "active" | "suspended" | "unissued";
  transferable: boolean;
  attestations: number;
  mintedAt: string | null;
  /** On-chain A-Token contract address from Cleanverse (when live). */
  contractAddress?: string | null;
};

/** Full trace of the three Cleanverse primitives behind one decision. */
export type CleanverseTrace = {
  cvi: { senderRef: string | null; recipientRef: string | null };
  cva: { tokenRef: string | null; tokenId: string | null };
  ccp: { decisionRef: string; rulesetId: string };
};

export type Evaluation = {
  decisionId: string;
  policyId: string;
  kind: PolicyKind;
  mode: "demo" | "live";
  approved: boolean;
  blockedBy: string | null;
  rules: RuleResult[];
  settlement: {
    chain: "Monad";
    txRef: string;
    /** Real chain write vs Machine Trust demo settlement reference. */
    kind?: "demo-settlement-ref" | "on-chain";
    /** Official Monad Testnet explorer URL when on-chain. */
    explorerUrl?: string;
    /** Deployed MachineTrustRegistry address when on-chain. */
    registryAddress?: string;
    /** Confirmed on-chain owner after register/transfer (when known). */
    ownerAddress?: string;
  } | null;
  aToken: AtokenRecord | null;
  trace: CleanverseTrace;
  evaluatedAt: string;
  notice?: string;
  /**
   * True when the client fell back to the local CCP engine after a transport
   * timeout/error. Never present this as a live Cleanverse approval.
   */
  degraded?: boolean;
};

export type PolicyInput = {
  kind: PolicyKind;
  sender: CviCredential;
  recipient: CviCredential | null;
  asset: CvaCredential;
  /** For transfers: the A-Token minted at issuance, if issuance already ran. */
  aToken?: AtokenRecord | null;
};
