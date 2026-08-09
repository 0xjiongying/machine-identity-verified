/**
 * Track 2 interactive guide — pure state derivation.
 * Never invents CVI/tx success; mirrors wallet + eligibility + position.
 */

import type { CreditPosition, EligibilityDecision } from "@/lib/lending/types";
import type { WalletStatus } from "@/lib/wallet/wallet-state";

export type GuideStepId = "wallet" | "cvi" | "machine" | "trust" | "eligibility" | "transaction";

export type GuidePhase =
  | "DISCONNECTED"
  | "WRONG_NETWORK"
  | "WALLET_CONNECTED"
  | "CVI_PENDING"
  | "CVI_FAILED"
  | "CVI_VERIFIED"
  | "MACHINE_SELECTED"
  | "MACHINE_UNAUTHORIZED"
  | "MACHINE_AUTHORIZED"
  | "DEFI_ELIGIBLE"
  | "DEFI_REJECTED"
  | "TRANSACTION_PENDING"
  | "TRANSACTION_CONFIRMED"
  | "COMPLETE";

export type GuideSnapshot = {
  phase: GuidePhase;
  stepIndex: number; // 0..5 for progress
  stepId: GuideStepId;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaAction:
    | "connect"
    | "switch_network"
    | "verify_cvi"
    | "confirm_machine"
    | "authorize"
    | "execute"
    | "view_tx"
    | "retry_cvi"
    | "retry_tx"
    | null;
  highlight: "wallet" | "cvi" | "machine" | "trust" | "eligibility" | "execute" | "tx" | null;
  completed: boolean[];
  explanation?: { term: string; text: string };
  statusLines?: string[];
};

const STEPS: GuideStepId[] = ["wallet", "cvi", "machine", "trust", "eligibility", "transaction"];

export type GuideInputs = {
  walletStatus: WalletStatus;
  walletAddress: string | null;
  onMonadTestnet: boolean;
  usingConnectedWallet: boolean;
  eligibility: EligibilityDecision | null;
  loading: boolean;
  acting: boolean;
  error: string | null;
  position: CreditPosition | null;
  lastTxHash: string | null;
  lastExplorerUrl: string | null;
  lastAction: string | null;
  machineConfirmed: boolean;
  /** When true, skip COMPLETE so the user can re-walk steps after an existing position. */
  replayGuide?: boolean;
};

function completedMask(upto: number): boolean[] {
  return STEPS.map((_, i) => i < upto);
}

export function deriveTrack2Guide(input: GuideInputs): GuideSnapshot {
  const {
    walletStatus,
    walletAddress,
    onMonadTestnet,
    eligibility,
    loading,
    acting,
    error,
    position,
    lastTxHash,
    lastExplorerUrl,
    lastAction,
    machineConfirmed,
  } = input;

  const cviOk = eligibility?.layers.cvi === "VERIFIED";
  const machineOk = eligibility?.layers.machine === "AUTHORIZED";
  const defiOk = eligibility?.layers.defi === "ELIGIBLE";
  const txDone =
    Boolean(position?.active) || (Boolean(lastTxHash) && lastAction === "openCreditDeposit");

  // Always start with wallet connection — sandbox positions must not skip Step 1.
  if (!walletAddress || walletStatus === "disconnected" || walletStatus === "unavailable") {
    return {
      phase: "DISCONNECTED",
      stepIndex: 0,
      stepId: "wallet",
      title: "Connect your wallet",
      body: "Connect a wallet on Monad Testnet to begin the trust flow.",
      ctaLabel: "Connect Wallet",
      ctaAction: "connect",
      highlight: "wallet",
      completed: completedMask(0),
      explanation: {
        term: "Operator wallet",
        text: "Your connected address is the operator identity checked by Cleanverse CVI and MachineTrustRegistry.",
      },
    };
  }

  if (acting) {
    return {
      phase: "TRANSACTION_PENDING",
      stepIndex: 5,
      stepId: "transaction",
      title: "Waiting for confirmation",
      body: "Confirm the transaction in your wallet / wait for Monad Testnet settlement.",
      ctaLabel: null,
      ctaAction: null,
      highlight: "execute",
      completed: completedMask(5),
      statusLines: ["Transaction pending…"],
    };
  }

  if (txDone && input.usingConnectedWallet && !input.replayGuide) {
    return {
      phase: "COMPLETE",
      stepIndex: 5,
      stepId: "transaction",
      title: "Trust flow complete",
      body: "Wallet → CVI → MachineTrust → DeFi eligibility → Monad transaction.",
      ctaLabel: lastExplorerUrl ? "View Transaction" : null,
      ctaAction: lastExplorerUrl ? "view_tx" : null,
      highlight: "tx",
      completed: [true, true, true, true, true, true],
      statusLines: [
        "✓ Wallet Connected",
        "✓ CVI Verified",
        "✓ Machine Authorized",
        "✓ DeFi Eligible",
        "✓ Transaction Confirmed",
      ],
      explanation: {
        term: "Monad proof",
        text: "The credit deposit is a real Monad Testnet transaction, independently verifiable on the explorer.",
      },
    };
  }

  if (walletStatus === "wrong_network" || (walletAddress && !onMonadTestnet)) {
    return {
      phase: "WRONG_NETWORK",
      stepIndex: 0,
      stepId: "wallet",
      title: "Wrong network",
      body: "Switch to Monad Testnet (chain 10143) to continue.",
      ctaLabel: "Switch to Monad Testnet",
      ctaAction: "switch_network",
      highlight: "wallet",
      completed: completedMask(0),
    };
  }

  if (walletStatus === "connecting" || walletStatus === "switching") {
    return {
      phase: "WALLET_CONNECTED",
      stepIndex: 0,
      stepId: "wallet",
      title: walletStatus === "switching" ? "Switching network…" : "Connecting…",
      body: "Confirm the request in your wallet.",
      ctaLabel: null,
      ctaAction: null,
      highlight: "wallet",
      completed: completedMask(0),
    };
  }

  if (loading && !eligibility) {
    return {
      phase: "CVI_PENDING",
      stepIndex: 1,
      stepId: "cvi",
      title: "Checking CVI verification…",
      body: "Querying Cleanverse for an active A-Pass on your connected wallet.",
      ctaLabel: null,
      ctaAction: null,
      highlight: "cvi",
      completed: completedMask(1),
      explanation: {
        term: "CVI",
        text: "Cleanverse Verified Identity — the identity signal used before machine authorization and DeFi access.",
      },
    };
  }

  if (eligibility && !cviOk) {
    return {
      phase: "CVI_FAILED",
      stepIndex: 1,
      stepId: "cvi",
      title: "Identity not verified",
      body: "Machine authorization and DeFi access stay locked until Cleanverse CVI succeeds.",
      ctaLabel: "Retry CVI",
      ctaAction: "retry_cvi",
      highlight: "cvi",
      completed: completedMask(1),
      statusLines: ["✗ CVI Not Verified", "Machine Trust LOCKED", "DeFi LOCKED"],
      explanation: {
        term: "CVI",
        text: "Without a verified A-Pass, the operator cannot become DeFi-eligible.",
      },
    };
  }

  if (cviOk && !machineConfirmed) {
    return {
      phase: "MACHINE_SELECTED",
      stepIndex: 2,
      stepId: "machine",
      title: "Confirm machine",
      body: "Associate your verified operator with the on-chain machine identity from MachineTrustRegistry.",
      ctaLabel: "Confirm Machine",
      ctaAction: "confirm_machine",
      highlight: "machine",
      completed: completedMask(2),
      statusLines: [
        `Machine ${eligibility?.machine.passportId ?? "—"}`,
        `Operator ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`,
      ],
      explanation: {
        term: "Machine identity",
        text: "The machine ID is registered on MachineTrustRegistry; ownership is read via ownerOf.",
      },
    };
  }

  if (cviOk && machineConfirmed && !machineOk) {
    return {
      phase: "MACHINE_UNAUTHORIZED",
      stepIndex: 3,
      stepId: "trust",
      title: "Machine not authorized",
      body: "This machine is not linked to your verified operator on MachineTrustRegistry.",
      ctaLabel: "Refresh Auth",
      ctaAction: "verify_cvi",
      highlight: "trust",
      completed: completedMask(3),
      statusLines: ["✓ CVI Verified", "✗ Machine Unauthorized", "DeFi LOCKED"],
      explanation: {
        term: "MachineTrustRegistry",
        text: "Links a verified operator wallet to a machine through an on-chain ownership record.",
      },
    };
  }

  if (cviOk && machineOk && !defiOk) {
    // Should be rare if layers are consistent
    return {
      phase: "MACHINE_AUTHORIZED",
      stepIndex: 4,
      stepId: "eligibility",
      title: "Checking DeFi eligibility",
      body: "CVI + machine authorization must both pass before DeFi unlocks.",
      ctaLabel: "Refresh Eligibility",
      ctaAction: "verify_cvi",
      highlight: "eligibility",
      completed: completedMask(4),
    };
  }

  if (cviOk && machineOk && defiOk && error) {
    return {
      phase: "DEFI_REJECTED",
      stepIndex: 5,
      stepId: "transaction",
      title: "DeFi action rejected",
      body: error,
      ctaLabel: "Retry",
      ctaAction: "retry_tx",
      highlight: "execute",
      completed: completedMask(5),
    };
  }

  if (cviOk && machineOk && defiOk) {
    // Need on-chain CVI mapping? authorize is optional if already eligible for deposit
    // Show eligibility step briefly via status, primary CTA = execute
    // If user hasn't authorized on-chain yet, offer authorize then execute
    const needsAuthorizeHint = lastAction !== "setCviEligible" && !position?.active;
    if (needsAuthorizeHint && lastAction !== "openCreditDeposit") {
      // Still eligible off-chain; allow authorize OR execute. Prefer eligibility panel then execute.
      return {
        phase: "DEFI_ELIGIBLE",
        stepIndex: 4,
        stepId: "eligibility",
        title: "DeFi eligible",
        body: "CVI verified + machine authorized. You may authorize on-chain, then execute the credit deposit.",
        ctaLabel: "Continue to DeFi",
        ctaAction: "authorize",
        highlight: "eligibility",
        completed: completedMask(5),
        statusLines: ["✓ CVI Verified", "✓ Machine Authorized", "✓ DeFi Eligible"],
        explanation: {
          term: "DeFi Eligibility",
          text: "Determines whether the verified operator/machine can execute the configured credit deposit.",
        },
      };
    }

    return {
      phase: "DEFI_ELIGIBLE",
      stepIndex: 5,
      stepId: "transaction",
      title: "Execute DeFi action",
      body: "Open a CVI-gated credit deposit on Monad Testnet for your authorized machine.",
      ctaLabel: "Execute",
      ctaAction: "execute",
      highlight: "execute",
      completed: completedMask(5),
      statusLines: ["✓ CVI Verified", "✓ Machine Authorized", "✓ DeFi Eligible"],
    };
  }

  // Connected, CVI verified path incomplete / initial
  if (walletAddress && onMonadTestnet && !eligibility) {
    return {
      phase: "WALLET_CONNECTED",
      stepIndex: 1,
      stepId: "cvi",
      title: "Verify identity",
      body: "CVI verifies the connected operator before machine access is authorized.",
      ctaLabel: "Verify with CVI",
      ctaAction: "verify_cvi",
      highlight: "cvi",
      completed: completedMask(1),
      explanation: {
        term: "CVI",
        text: "Cleanverse Verified Identity provides the identity signal used to establish operator eligibility.",
      },
    };
  }

  // Fallback: connected + have eligibility but cvi ok waiting verify click
  return {
    phase: "WALLET_CONNECTED",
    stepIndex: 1,
    stepId: "cvi",
    title: "Verify identity",
    body: "CVI verifies the connected operator before machine access is authorized.",
    ctaLabel: "Verify with CVI",
    ctaAction: "verify_cvi",
    highlight: "cvi",
    completed: completedMask(1),
    explanation: {
      term: "CVI",
      text: "Cleanverse Verified Identity provides the identity signal used to establish operator eligibility.",
    },
  };
}

export const GUIDE_STEP_LABELS = ["Wallet", "CVI", "Machine", "Trust", "DeFi", "TX"] as const;
