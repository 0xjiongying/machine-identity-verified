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
