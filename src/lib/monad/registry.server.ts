/**
 * Optional MachineTrustRegistry writer — server-only.
 *
 * Explicit opt-in: only attempts an on-chain write when
 * MONAD_TESTNET_RPC_URL + MACHINETRUST_REGISTRY_ADDRESS + MONAD_TESTNET_PRIVATE_KEY
 * are all set. Never fabricates a successful explorer tx.
 *
 * Deployment of the contract is a separate, manual operation (see contracts/).
 */

import { createHash } from "node:crypto";

import { readMonadConfig, readMonadOperatorKey } from "./config.server";

const REGISTRY_ABI = [
  "function registerMachine(bytes32 machineId, bytes32 passportHash, bytes32 cleanverseAssetRef, address owner_)",
  "function transferOwnership(bytes32 machineId, address to, bytes32 cleanverseDecisionRef)",
  "function ownerOf(bytes32 machineId) view returns (address)",
] as const;

export type RegistryWriteResult =
  | {
      ok: true;
      txHash: string;
      kind: "on-chain";
      chain: "Monad";
    }
  | {
      ok: false;
      reason: string;
      kind: "skipped" | "error";
    };

function bytes32Commitment(value: string): `0x${string}` {
  // Opaque bytes32 commitment (sha256). Not used as a Cleanverse proof substitute.
  const digest = createHash("sha256").update(value).digest("hex");
  return `0x${digest}`;
}

/**
 * After CCP approval, attempt a registry write when fully configured.
 * Returns skipped when registry/operator are not configured (caller keeps DEMO settlement ref).
 */
export async function maybeWriteRegistry(input: {
  kind: "issuance" | "transfer";
  machineKey: string;
  passportId: string;
  cleanverseAssetRef: string;
  ownerAddress: string;
  decisionRef: string;
  recipientAddress?: string | null;
}): Promise<RegistryWriteResult> {
  const cfg = readMonadConfig();
  if (!cfg.canWrite || !cfg.rpcUrl || !cfg.registryAddress) {
    return {
      ok: false,
      kind: "skipped",
      reason: "Monad registry write not configured (RPC / registry / operator key).",
    };
  }

  const privateKey = readMonadOperatorKey();
  if (!privateKey) {
    return {
      ok: false,
      kind: "skipped",
      reason: "MONAD_TESTNET_PRIVATE_KEY unset — registry write skipped.",
    };
  }

  try {
    const { createWalletClient, createPublicClient, http, parseAbi, getAddress } =
      await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");

    const account = privateKeyToAccount(
      (privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`) as `0x${string}`,
    );
    const transport = http(cfg.rpcUrl);
    const chain = {
      id: cfg.chainId ?? 10143,
      name: cfg.networkLabel,
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: [cfg.rpcUrl] } },
    } as const;

    const wallet = createWalletClient({ account, chain, transport });
    const publicClient = createPublicClient({ chain, transport });
    const abi = parseAbi([...REGISTRY_ABI]);
    const registry = getAddress(cfg.registryAddress);

    const machineId = bytes32Commitment(input.machineKey);
    const passportHash = bytes32Commitment(input.passportId);
    const assetRef = bytes32Commitment(input.cleanverseAssetRef);
    const decisionRef = bytes32Commitment(input.decisionRef);

    let hash: `0x${string}`;
    if (input.kind === "issuance") {
      const owner = getAddress(input.ownerAddress);
      const { request } = await publicClient.simulateContract({
        address: registry,
        abi,
        functionName: "registerMachine",
        args: [machineId, passportHash, assetRef, owner],
        account,
      });
      hash = await wallet.writeContract(request);
    } else {
      const to = getAddress(input.recipientAddress ?? input.ownerAddress);
      const { request } = await publicClient.simulateContract({
        address: registry,
        abi,
        functionName: "transferOwnership",
        args: [machineId, to, decisionRef],
        account,
      });
      hash = await wallet.writeContract(request);
    }

    await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    return { ok: true, txHash: hash, kind: "on-chain", chain: "Monad" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "registry write failed";
    const sanitized = message.replace(/0x[a-fA-F0-9]{64}/g, "0x[redacted]");
    console.error("[MachineTrust] registry write failed:", sanitized);
    return { ok: false, kind: "error", reason: sanitized };
  }
}
