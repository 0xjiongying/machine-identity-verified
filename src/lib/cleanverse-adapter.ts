/**
 * CleanverseAdapter
 *
 * Single boundary between the UI and Cleanverse identity/compliance services.
 * This prototype ships a DEMO adapter with deterministic local results.
 * Swapping in a production adapter (real CVI/CVA + policy engine) requires no
 * changes to any component: only the implementation behind this interface.
 */

export type CheckId = "identity" | "asset" | "policy" | "compliance" | "settlement";

export type CheckResult = {
  id: CheckId;
  label: string;
  detail: string;
  status: "pass" | "fail";
};

export type EvaluationResult = {
  mode: "demo" | "live";
  approved: boolean;
  checks: CheckResult[];
  blockedBy?: CheckId | undefined;
  txRef?: string | undefined;
};

export interface CleanverseAdapter {
  readonly mode: "demo" | "live";
  evaluateIssuance(input: {
    issuerVerified: boolean;
    assetEligible: boolean;
  }): Promise<EvaluationResult>;
  evaluateTransfer(input: {
    issuerVerified: boolean;
    assetEligible: boolean;
    recipientVerified: boolean;
  }): Promise<EvaluationResult>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoCleanverseAdapter: CleanverseAdapter = {
  mode: "demo",

  async evaluateIssuance({ issuerVerified, assetEligible }) {
    await wait(120);
    const checks: CheckResult[] = [
      {
        id: "identity",
        label: "Identity check",
        detail: "CVI — issuer credential",
        status: issuerVerified ? "pass" : "fail",
      },
      {
        id: "asset",
        label: "Asset check",
        detail: "CVA — machine passport attested",
        status: assetEligible ? "pass" : "fail",
      },
      {
        id: "compliance",
        label: "Compliance policy",
        detail: "Issuance policy MT-ISS-01",
        status: issuerVerified && assetEligible ? "pass" : "fail",
      },
      {
        id: "settlement",
        label: "Monad",
        detail: "Execution of approved issuance",
        status: issuerVerified && assetEligible ? "pass" : "fail",
      },
    ];
    const blocked = checks.find((c) => c.status === "fail");
    return {
      mode: "demo",
      approved: !blocked,
      checks,
      blockedBy: blocked?.id,
      txRef: blocked ? undefined : "monad:tx/0x2f90…be31",
    };
  },

  async evaluateTransfer({ issuerVerified, assetEligible, recipientVerified }) {
    await wait(120);
    const checks: CheckResult[] = [
      {
        id: "identity",
        label: "Issuer",
        detail: "CVI — sender credential",
        status: issuerVerified ? "pass" : "fail",
      },
      {
        id: "asset",
        label: "Asset",
        detail: "CVA — asset status ACTIVE",
        status: assetEligible ? "pass" : "fail",
      },
      {
        id: "compliance",
        label: "Recipient",
        detail: "CVI — counterparty credential",
        status: recipientVerified ? "pass" : "fail",
      },
      {
        id: "policy",
        label: "Policy",
        detail: "Transfer policy MT-TRF-02",
        status: recipientVerified ? "pass" : "fail",
      },
      {
        id: "settlement",
        label: "Monad",
        detail: "Settlement of approved transfer",
        status: recipientVerified && assetEligible ? "pass" : "fail",
      },
    ];
    const blocked = checks.find((c) => c.status === "fail");
    return {
      mode: "demo",
      approved: !blocked,
      checks,
      blockedBy: blocked?.id,
      txRef: blocked ? undefined : "monad:tx/0x8b73…c410",
    };
  },
};

export const cleanverse: CleanverseAdapter = demoCleanverseAdapter;
