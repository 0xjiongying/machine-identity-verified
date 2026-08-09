/**
 * MachineTrustCredit on-chain writer — server-only.
 *
 * Never fabricates explorer tx hashes. Skips when not configured.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { readMonadConfig, readMonadOperatorKey } from "@/lib/monad/config.server";
import { MACHINE_TRUST_REGISTRY_DEPLOYMENT, monadTestnetTxUrl } from "@/lib/monad/explorer";
import type { CreditPosition, EligibilityDecision } from "./types";

const CREDIT_ABI = [
  "function setCviEligible(address wallet, bool eligible, bytes32 cviRef)",
  "function openCreditDeposit(address borrower, bytes32 machineId, bytes32 cviRef) payable returns (uint256)",
  "function cviEligible(address) view returns (bool)",
  "function positions(address) view returns (bytes32 machineId, bytes32 cviRef, uint256 deposit, uint64 openedAt, bool active)",
  "function isAuthorized(address wallet, bytes32 machineId) view returns (bool)",
  "function registry() view returns (address)",
  "function oracle() view returns (address)",
  "function totalDeposits() view returns (uint256)",
] as const;

export type CreditActionWrite =
  | { ok: true; kind: "on-chain"; reason: string; position: CreditPosition; txHash: string }
  | {
      ok: false;
      kind: "not-configured" | "rejected" | "error";
      reason: string;
      position: null;
      txHash: null;
    };

export type CreditMarketConfig = {
  creditAddress: string | null;
  registryAddress: string;
  chainId: number;
  explorerBaseUrl: string;
  machineId: string | null;
  machineOwner: string | null;
  passportId: string | null;
  configured: boolean;
  oracle: string | null;
};

function creditAddress(): string | null {
  return process.env["MACHINE_TRUST_CREDIT_ADDRESS"]?.trim() || null;
}

export function loadProofMachine(): { machineId: `0x${string}`; passportId: string } {
  try {
    const raw = readFileSync(resolve("contracts/deployments/monad-testnet.json"), "utf8");
    const artifact = JSON.parse(raw) as { machineId?: string; passportId?: string };
    if (artifact.machineId?.startsWith("0x") && artifact.machineId.length === 66) {
      return {
        machineId: artifact.machineId as `0x${string}`,
        passportId: artifact.passportId ?? "MT-PROOF",
      };
    }
  } catch {
    /* fall through */
  }
  const passportId = "MT-PROOF-TRACK2";
  return {
    machineId: `0x${createHash("sha256").update(passportId).digest("hex")}` as `0x${string}`,
    passportId,
  };
}

function toBytes32(hexOrString: string): `0x${string}` {
  if (hexOrString.startsWith("0x") && hexOrString.length === 66) {
    return hexOrString as `0x${string}`;
  }
  return `0x${createHash("sha256").update(hexOrString).digest("hex")}`;
}

export function getCreditConfig(): CreditMarketConfig {
  const cfg = readMonadConfig();
  const address = creditAddress();
  const proof = loadProofMachine();
  let machineOwner: string | null = null;
  try {
    const raw = readFileSync(resolve("contracts/deployments/monad-testnet.json"), "utf8");
    const artifact = JSON.parse(raw) as { ownerAfterTransfer?: string };
    machineOwner = artifact.ownerAfterTransfer ?? null;
  } catch {
    machineOwner = null;
  }
  return {
    creditAddress: address,
    registryAddress:
      cfg.registryAddress ?? MACHINE_TRUST_REGISTRY_DEPLOYMENT.contractAddress,
    chainId: cfg.chainId ?? 10143,
    explorerBaseUrl: "https://testnet.monadvision.com",
    machineId: proof.machineId,
    machineOwner,
    passportId: proof.passportId,
    configured: Boolean(address && cfg.rpcUrl),
    oracle: process.env["MACHINETRUST_OPERATOR_ADDRESS"]?.trim() ?? null,
  };
}

export async function readCreditPosition(
  wallet: string,
): Promise<CreditPosition | null> {
  const address = creditAddress();
  const cfg = readMonadConfig();
  if (!address || !cfg.rpcUrl) return null;

  try {
    const { createPublicClient, http, parseAbi, getAddress, formatEther } = await import("viem");
    const client = createPublicClient({ transport: http(cfg.rpcUrl) });
    const result = await client.readContract({
      address: getAddress(address),
      abi: parseAbi([...CREDIT_ABI]),
      functionName: "positions",
      args: [getAddress(wallet)],
    });
    const [machineId, cviRef, deposit, openedAt, active] = result as [
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      boolean,
    ];
    if (!active || deposit === 0n) return null;
    return {
      borrower: wallet,
      machineId,
      depositWei: deposit.toString(),
      depositMon: formatEther(deposit),
      cviRef,
      openedAt: Number(openedAt),
      active,
      txHash: null,
      explorerUrl: null,
      contractAddress: address,
      kind: "on-chain",
    };
  } catch {
    return null;
  }
}

export async function applyCviEligibilityOnChain(
  decision: EligibilityDecision,
): Promise<{ ok: boolean; txHash: string | null; notice: string }> {
  const address = creditAddress();
  const cfg = readMonadConfig();
  const key = readMonadOperatorKey();
  if (!address || !cfg.rpcUrl || !key) {
    return {
      ok: false,
      txHash: null,
      notice:
        "MACHINE_TRUST_CREDIT_ADDRESS / Monad operator not configured — CVI eligibility recorded off-chain only.",
    };
  }
  if (decision.mode !== "live") {
    return {
      ok: false,
      txHash: null,
      notice: "Refusing on-chain CVI write without live Cleanverse query_apass.",
    };
  }

  try {
    const { createWalletClient, createPublicClient, http, parseAbi, getAddress } =
      await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(
      (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`,
    );
    const chain = {
      id: cfg.chainId ?? 10143,
      name: "monad-testnet",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: [cfg.rpcUrl] } },
    } as const;
    const transport = http(cfg.rpcUrl);
    const wallet = createWalletClient({ account, chain, transport });
    const publicClient = createPublicClient({ chain, transport });
    const abi = parseAbi([...CREDIT_ABI]);
    const contract = getAddress(address);

    const { request } = await publicClient.simulateContract({
      address: contract,
      abi,
      functionName: "setCviEligible",
      args: [
        getAddress(decision.wallet),
        decision.cvi.active,
        toBytes32(decision.cviRef ?? `cvi:denied:${decision.wallet}`),
      ],
      account,
    });
    const txHash = await wallet.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 120_000 });
    return {
      ok: true,
      txHash,
      notice: `On-chain setCviEligible confirmed (${decision.cvi.active ? "verified" : "unverified"}).`,
    };
  } catch (error) {
    return {
      ok: false,
      txHash: null,
      notice: error instanceof Error ? error.message : "setCviEligible failed",
    };
  }
}

export async function openCreditDepositOnChain(
  decision: EligibilityDecision,
  amountWei: bigint,
): Promise<CreditActionWrite> {
  const address = creditAddress();
  const cfg = readMonadConfig();
  const key = readMonadOperatorKey();
  if (!address || !cfg.rpcUrl || !key) {
    return {
      ok: false,
      kind: "not-configured",
      reason: "MACHINE_TRUST_CREDIT_ADDRESS not configured — refusing fabricated DeFi tx.",
      position: null,
      txHash: null,
    };
  }
  if (decision.mode !== "live") {
    return {
      ok: false,
      kind: "rejected",
      reason: "Refusing DeFi deposit without live Cleanverse CVI.",
      position: null,
      txHash: null,
    };
  }
  if (!decision.eligible || !decision.cviRef) {
    return {
      ok: false,
      kind: "rejected",
      reason: "CVI/machine gate blocked — DeFi deposit not submitted.",
      position: null,
      txHash: null,
    };
  }

  try {
    const { createWalletClient, createPublicClient, http, parseAbi, getAddress, formatEther } =
      await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const account = privateKeyToAccount(
      (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`,
    );
    const chain = {
      id: cfg.chainId ?? 10143,
      name: "monad-testnet",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: [cfg.rpcUrl] } },
    } as const;
    const transport = http(cfg.rpcUrl);
    const wallet = createWalletClient({ account, chain, transport });
    const publicClient = createPublicClient({ chain, transport });
    const abi = parseAbi([...CREDIT_ABI]);
    const contract = getAddress(address);
    const machineId = decision.machine.machineId as `0x${string}`;

    const { request } = await publicClient.simulateContract({
      address: contract,
      abi,
      functionName: "openCreditDeposit",
      args: [getAddress(decision.wallet), machineId, toBytes32(decision.cviRef)],
      account,
      value: amountWei,
    });
    const txHash = await wallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 120_000,
    });
    if (receipt.status !== "success") {
      return {
        ok: false,
        kind: "error",
        reason: "openCreditDeposit reverted",
        position: null,
        txHash: null,
      };
    }

    const position: CreditPosition = {
      borrower: decision.wallet,
      machineId,
      depositWei: amountWei.toString(),
      depositMon: formatEther(amountWei),
      cviRef: decision.cviRef,
      openedAt: Math.floor(Date.now() / 1000),
      active: true,
      txHash,
      explorerUrl: monadTestnetTxUrl(txHash),
      contractAddress: address,
      kind: "on-chain",
    };
    return {
      ok: true,
      kind: "on-chain",
      reason: "Credit deposit confirmed on Monad Testnet.",
      position,
      txHash,
    };
  } catch (error) {
    return {
      ok: false,
      kind: "error",
      reason: error instanceof Error ? error.message : "openCreditDeposit failed",
      position: null,
      txHash: null,
    };
  }
}
