/**
 * Official Monad Testnet explorer helpers.
 * Source: https://docs.monad.xyz/developer-essentials/testnet
 *
 * Safe for client import — no secrets.
 */

export const MONAD_TESTNET = {
  chainId: 10143,
  networkName: "Monad Testnet",
  currency: "MON",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  /** Official explorers from docs.monad.xyz testnet network information */
  explorers: {
    monadvision: "https://testnet.monadvision.com",
    monadscan: "https://testnet.monadscan.com",
  },
  faucet: "https://faucet.monad.xyz",
} as const;

/** Primary explorer used in Machine Trust UI links. */
export const MONAD_TESTNET_EXPLORER = MONAD_TESTNET.explorers.monadvision;

/**
 * Public, explorer-verified MachineTrustRegistry deployment (no secrets).
 * Mirrored from contracts/deployments/monad-testnet.json after real deploy.
 * Ownership register/transfer txs stay null until CCP data.code 4 approves a write.
 */
export const MACHINE_TRUST_REGISTRY_DEPLOYMENT = {
  network: "Monad Testnet",
  chainId: 10143,
  contractAddress: "0x83753166684AfB4912a61713c49Feada6298dF19" as const,
  deployTx: "0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033" as const,
  registrationTx: null as string | null,
  ownershipTransferTx: null as string | null,
  cleanverseGate: "BLOCKED" as const,
  explorers: {
    contract: "https://testnet.monadvision.com/address/0x83753166684AfB4912a61713c49Feada6298dF19",
    deployTx:
      "https://testnet.monadvision.com/tx/0xa6fbe2a7da222eabda364fce8230e98d18d8add31db6e0c5dc3cb8bcecaf8033",
  },
} as const;

export function monadTestnetTxUrl(txHash: string): string {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  return `${MONAD_TESTNET_EXPLORER}/tx/${hash}`;
}

export function monadTestnetAddressUrl(address: string): string {
  return `${MONAD_TESTNET_EXPLORER}/address/${address}`;
}

export function isLikelyTxHash(value: string | null | undefined): boolean {
  return Boolean(value && /^0x[a-fA-F0-9]{64}$/.test(value));
}
