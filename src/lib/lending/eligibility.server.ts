/**
 * Track 2 eligibility — OFF-CHAIN Cleanverse gates for the lending pool.
 *
 * Flow (API v5.6):
 *   1. query_apass          → active A-Pass (CVI)
 *   2. bind registered A-Token → aUSDC on Monad (CVA settlement layer)
 *   3. verify_apass         → data.code === 4 only (CCP)  [HTTP 200 / 0000 alone ≠ approval]
 *
 * Unverified wallets never become protocol-eligible.
 */

import { CleanverseError, readConfig } from "@/lib/cleanverse/api.server";
import {
  APassService,
  ATokenService,
  ComplianceService,
} from "@/lib/cleanverse/services/index.server";
import { createHash } from "node:crypto";
import type { CcpGateResult, CviGateResult, EligibilityDecision } from "./types";

function decisionId(wallet: string) {
  return `mt:elig/0x${createHash("sha256").update(`${wallet}:${Date.now()}`).digest("hex").slice(0, 12)}`;
}

function complianceRef(wallet: string, cvi: string, ccp: string) {
  return `ccp:elig/0x${createHash("sha256").update(`${wallet}:${cvi}:${ccp}`).digest("hex").slice(0, 16)}`;
}

function demoDecision(wallet: string, knownActive: boolean): EligibilityDecision {
  const now = new Date().toISOString();
  const cvi: CviGateResult = {
    wallet,
    chain: "monad",
    mode: "demo",
    active: knownActive,
    cvRecordId: knownActive ? "demo-local" : null,
    tier: knownActive ? "3" : null,
    countries: knownActive ? ["DE"] : [],
    status: knownActive ? 1 : null,
    envelopeCode: knownActive ? "0000" : "0002",
    envelopeMessage: knownActive ? "demo active A-Pass" : "demo: apass not found",
    magickLink: knownActive ? null : "https://test-magiclink.cleanverse.com/",
  };
  const ccp: CcpGateResult | null = knownActive
    ? {
        allowed: true,
        code: "4",
        reason: "Demo CCP: local fixture allows verified borrower.",
        atoken: "demo:ausdc",
        envelopeCode: "0000",
      }
    : {
        allowed: false,
        code: "2",
        reason: "Demo CCP: no A-Pass — lending access denied.",
        atoken: null,
        envelopeCode: "0000",
      };

  const eligible = knownActive && !!ccp?.allowed;
  return {
    decisionId: decisionId(wallet),
    wallet,
    mode: "demo",
    status: eligible ? "eligible" : "blocked",
    eligible,
    cvi,
    ccp,
    complianceRef: eligible ? complianceRef(wallet, "demo", ccp.code) : null,
    notice:
      "Demo mode — no Cleanverse credentials configured. Local fixtures only; not a live sandbox decision.",
    evaluatedAt: now,
    layers: {
      cvi: knownActive ? "VERIFIED" : "UNVERIFIED",
      compliance: eligible ? "APPROVED" : "REJECTED",
      pool: eligible ? "ELIGIBLE" : "BLOCKED",
    },
  };
}

export async function evaluateBorrowerEligibility(
  wallet: string,
  opts?: { forceDemoActive?: boolean },
): Promise<EligibilityDecision> {
  const cfg = readConfig();
  if (!cfg) {
    const known =
      opts?.forceDemoActive === true ||
      [
        "0x5d6b84e2cab95b72ed74fb4768324763f4950d9e",
        "0xc8ba032092cc2499637f4e331e841ab24d1c9964",
      ].includes(wallet.toLowerCase());
    return demoDecision(wallet, known);
  }

  const now = new Date().toISOString();
  try {
    // 1 — CVI
    const lookup = await APassService.lookup(cfg, wallet);
    const cvi: CviGateResult = {
      wallet,
      chain: cfg.chain,
      mode: "live",
      active: lookup.active,
      cvRecordId: lookup.ref,
      tier: lookup.tier,
      countries: lookup.countries,
      status: lookup.status ?? null,
      envelopeCode: lookup.envelope.code,
      envelopeMessage: lookup.envelope.message,
      magickLink: null,
    };

    if (!lookup.active) {
      return {
        decisionId: decisionId(wallet),
        wallet,
        mode: "live",
        status: "blocked",
        eligible: false,
        cvi,
        ccp: null,
        complianceRef: null,
        notice: "CVI rejected — Cleanverse returned no active A-Pass. Lending pool access denied.",
        evaluatedAt: now,
        layers: { cvi: "UNVERIFIED", compliance: "REJECTED", pool: "BLOCKED" },
      };
    }

    // 2 — CVA bind (settlement/asset layer for verify_apass)
    const { bound } = await ATokenService.bindRegistered(cfg);
    const atoken = bound?.address ?? null;
    if (!atoken) {
      return {
        decisionId: decisionId(wallet),
        wallet,
        mode: "live",
        status: "unavailable",
        eligible: false,
        cvi,
        ccp: {
          allowed: false,
          code: "1",
          reason: "No registered A-Token available for CCP verify_apass.",
          atoken: null,
          envelopeCode: "0002",
        },
        complianceRef: null,
        notice: "CVA unavailable — cannot run verify_apass without a registered A-Token.",
        evaluatedAt: now,
        layers: { cvi: "VERIFIED", compliance: "UNAVAILABLE", pool: "LOCKED" },
      };
    }

    // 3 — CCP (verify_apass data.code 4 only)
    const verdict = await ComplianceService.verifyTransferEligibility(cfg, atoken, wallet);
    const ccp: CcpGateResult = {
      allowed: verdict.allowed,
      code: verdict.code,
      reason: verdict.reason,
      atoken,
      envelopeCode: verdict.envelope.code,
    };

    if (verdict.envelope.data?.magickLink) {
      cvi.magickLink = verdict.envelope.data.magickLink;
    }

    const eligible = verdict.allowed;
    return {
      decisionId: decisionId(wallet),
      wallet,
      mode: "live",
      status: eligible ? "eligible" : "blocked",
      eligible,
      cvi,
      ccp,
      complianceRef: eligible ? complianceRef(wallet, lookup.ref ?? "cvi", verdict.code) : null,
      notice: eligible
        ? `Live Cleanverse sandbox: CVI active + CCP verify_apass data.code ${verdict.code}. Pool access unlocked.`
        : `Live Cleanverse sandbox: CCP rejected (data.code ${verdict.code}). ${verdict.reason}`,
      evaluatedAt: now,
      layers: {
        cvi: "VERIFIED",
        compliance: eligible ? "APPROVED" : "REJECTED",
        pool: eligible ? "ELIGIBLE" : "BLOCKED",
      },
    };
  } catch (error) {
    const message =
      error instanceof CleanverseError
        ? error.message
        : error instanceof Error
          ? error.message
          : "unknown error";
    return {
      decisionId: decisionId(wallet),
      wallet,
      mode: "live",
      status: "unavailable",
      eligible: false,
      cvi: null,
      ccp: null,
      complianceRef: null,
      notice: `Cleanverse unreachable — fail closed. ${message}`,
      evaluatedAt: now,
      layers: { cvi: "UNAVAILABLE", compliance: "UNAVAILABLE", pool: "LOCKED" },
    };
  }
}
