/**
 * Client-safe Monad Testnet chain helpers for EIP-1193 wallets.
 * No secrets. Source: https://docs.monad.xyz/developer-essentials/testnet
 */

import { MONAD_TESTNET } from "@/lib/monad/explorer";

export const MONAD_CHAIN_ID = MONAD_TESTNET.chainId; // 10143
export const MONAD_CHAIN_ID_HEX = `0x${MONAD_CHAIN_ID.toString(16)}` as const; // 0x279f

export const MONAD_WALLET_CHAIN = {
  chainId: MONAD_CHAIN_ID_HEX,
  chainName: MONAD_TESTNET.networkName,
  nativeCurrency: {
    name: "MON",
    symbol: MONAD_TESTNET.currency,
    decimals: 18,
  },
  rpcUrls: [MONAD_TESTNET.rpcUrl],
  blockExplorerUrls: [MONAD_TESTNET.explorers.monadvision],
} as const;

export function shortAddress(address: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isMonadTestnet(chainId: number | null | undefined) {
  return chainId === MONAD_CHAIN_ID;
}
