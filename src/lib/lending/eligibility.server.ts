/**
 * Track 2 eligibility — CVI + MachineTrustRegistry authorization.
 *
 * Flow:
 *   1. POST /query_apass → active A-Pass (CVI) — real Cleanverse API when configured
 *   2. MachineTrustRegistry.ownerOf(machineId) == wallet → machine authorized
 *   3. DeFi eligible only when both pass
 *
 * CCP is intentionally NOT required for Track 2 (CVI OR CVA). Track 1 CCP
 * ComplianceFailed states remain separate and are never fabricated as Passed.
 *
 * Never hardcodes verified=true. Without Cleanverse credentials, status is "error".
 */

import { createHash } from "node:crypto";

import { readConfig } from "@/lib/cleanverse/api.server";
import { APassService } from "@/lib/cleanverse/services/index.server";
import { readMonadConfig } from "@/lib/monad/config.server";
import { loadProofMachine } from "./credit.server";
import type { CVIStatus, CviGateResult, EligibilityDecision, MachineAuthResult } from "./types";

function decisionId(wallet: string) {
  return `mt:t2/0x${createHash("sha256").update(`${wallet}:${Date.now()}`).digest("hex").slice(0, 12)}`;
}

function cviRef(wallet: string, cvRecordId: string | null) {
  return `0x${createHash("sha256")
    .update(`cvi:${wallet}:${cvRecordId ?? "none"}`)
    .digest("hex")}`;
}

function mapCviStatus(active: boolean, errored: boolean): CVIStatus {
  if (errored) return "error";
  return active ? "verified" : "unverified";
}

async function readMachineOwner(machineId: `0x${string}`): Promise<{
  owner: string | null;
  registryAddress: string | null;
  reason: string;
}> {
  const cfg = readMonadConfig();
  const registryAddress = cfg.registryAddress;
  if (!cfg.rpcUrl || !registryAddress) {
    return {
      owner: null,
      registryAddress: registryAddress ?? null,
      reason: "Registry RPC/address not configured — machine ownership unread.",
    };
  }
  try {
    const { createPublicClient, http, parseAbi, getAddress } = await import("viem");
    const client = createPublicClient({ transport: http(cfg.rpcUrl) });
    const owner = await client.readContract({
      address: getAddress(registryAddress),
      abi: parseAbi(["function ownerOf(bytes32 machineId) view returns (address)"]),
      functionName: "ownerOf",
      args: [machineId],
    });
    return {
      owner: String(owner),
      registryAddress,
      reason: "ownerOf read from MachineTrustRegistry.",
    };
  } catch (error) {
    return {
      owner: null,
      registryAddress,
      reason: error instanceof Error ? error.message : "ownerOf failed",
    };
  }
}

export async function evaluateTrack2Eligibility(wallet: string): Promise<EligibilityDecision> {
  const normalized = wallet.trim();
  const { machineId, passportId } = loadProofMachine();
  const cfg = readConfig();
  const now = new Date().toISOString();

  let cvi: CviGateResult;
  if (!cfg) {
    cvi = {
      wallet: normalized,
      chain: "monad",
      mode: "demo",
      status: "error",
      active: false,
      cvRecordId: null,
      tier: null,
      countries: [],
      apassStatus: null,
      envelopeCode: "config",
      envelopeMessage: "Cleanverse credentials missing — CVI cannot be verified.",
      raw: { code: "config", message: "not configured", hasCvRecordId: false },
    };
  } else {
    try {
      const lookup = await APassService.lookup(cfg, normalized);
      cvi = {
        wallet: normalized,
        chain: cfg.chain,
        mode: "live",
        status: mapCviStatus(lookup.active, false),
        active: lookup.active,
        cvRecordId: lookup.ref,
        tier: lookup.tier,
        countries: lookup.countries,
        apassStatus: lookup.status ?? null,
        envelopeCode: lookup.envelope.code,
        envelopeMessage: lookup.envelope.message,
        raw: {
          code: lookup.envelope.code,
          message: lookup.envelope.message,
          hasCvRecordId: Boolean(lookup.ref),
        },
      };
    } catch (error) {
      cvi = {
        wallet: normalized,
        chain: cfg.chain,
        mode: "live",
        status: "error",
        active: false,
        cvRecordId: null,
        tier: null,
        countries: [],
        apassStatus: null,
        envelopeCode: "error",
        envelopeMessage: error instanceof Error ? error.message : "CVI lookup failed",
        raw: { code: "error", message: "lookup failed", hasCvRecordId: false },
      };
    }
  }

  const ownership = await readMachineOwner(machineId);
  const authorized =
    Boolean(ownership.owner) && ownership.owner!.toLowerCase() === normalized.toLowerCase();

  const machine: MachineAuthResult = {
    machineId,
    passportId,
    registryAddress: ownership.registryAddress,
    owner: ownership.owner,
    authorized,
    reason: authorized
      ? "CVI wallet matches MachineTrustRegistry.ownerOf(machineId)."
      : ownership.owner
        ? `Registry owner is ${ownership.owner}; connected wallet is not the machine owner.`
        : ownership.reason,
  };

  const eligible = cvi.mode === "live" && cvi.active && cvi.status === "verified" && authorized;

  return {
    decisionId: decisionId(normalized),
    wallet: normalized,
    mode: cvi.mode,
    eligible,
    cvi,
    machine,
    cviRef: cvi.active ? cviRef(normalized, cvi.cvRecordId) : null,
    notice: eligible
      ? "CVI verified and machine authorized — DeFi credit deposit may proceed."
      : cvi.status === "error"
        ? "CVI lookup error — DeFi locked until Cleanverse verification succeeds."
        : !cvi.active
          ? "CVI not verified — Cleanverse A-Pass required. DeFi locked."
          : "Machine Trust authorization locked — wallet is not the on-chain machine owner.",
    evaluatedAt: now,
    layers: {
      cvi:
        cvi.status === "error"
          ? "ERROR"
          : cvi.status === "pending"
            ? "PENDING"
            : cvi.active
              ? "VERIFIED"
              : "UNVERIFIED",
      machine: authorized ? "AUTHORIZED" : ownership.owner ? "LOCKED" : "UNKNOWN",
      defi: eligible ? "ELIGIBLE" : "LOCKED",
    },
  };
}
