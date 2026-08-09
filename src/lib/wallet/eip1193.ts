/**
 * Minimal EIP-1193 helpers — injected browser wallets (MetaMask / compatible).
 * Uses viem already in the project. No RainbowKit / wagmi dependency.
 */

import type { EIP1193Provider } from "viem";

declare global {
  interface Window {
    ethereum?: EIP1193Provider & {
      isMetaMask?: boolean;
      providers?: EIP1193Provider[];
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export type InjectedProvider = NonNullable<Window["ethereum"]>;

export function getInjectedProvider(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum;
  if (!eth) return null;
  // Some multi-wallet injectors expose providers[]
  const list = eth.providers;
  if (Array.isArray(list) && list.length > 0) {
    const metamask = list.find((p) => (p as { isMetaMask?: boolean }).isMetaMask);
    return (metamask ?? list[0]) as InjectedProvider;
  }
  return eth;
}

export function walletErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Wallet error";
  const e = error as { code?: number | string; message?: string; shortMessage?: string };
  if (e.code === 4001 || e.code === "ACTION_REJECTED") {
    return "Connection cancelled in wallet.";
  }
  if (e.code === 4902) {
    return "Monad Testnet not found in wallet — trying to add it.";
  }
  if (typeof e.shortMessage === "string" && e.shortMessage) return e.shortMessage;
  if (typeof e.message === "string" && e.message) {
    // Strip noisy provider prefixes for UI
    return e.message.replace(/^Provider Error:\s*/i, "").slice(0, 180);
  }
  return "Wallet provider error.";
}

export async function requestAccounts(provider: InjectedProvider): Promise<string[]> {
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  return accounts ?? [];
}

export async function readAccounts(provider: InjectedProvider): Promise<string[]> {
  const accounts = (await provider.request({ method: "eth_accounts" })) as string[];
  return accounts ?? [];
}

export async function readChainId(provider: InjectedProvider): Promise<number> {
  const hex = (await provider.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(hex, 16);
}

export async function switchToMonadTestnet(
  provider: InjectedProvider,
  addParams: {
    chainId: string;
    chainName: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: readonly string[];
    blockExplorerUrls: readonly string[];
  },
): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: addParams.chainId }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    // 4902 = unrecognized chain — add then switch
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: addParams.chainId,
            chainName: addParams.chainName,
            nativeCurrency: addParams.nativeCurrency,
            rpcUrls: [...addParams.rpcUrls],
            blockExplorerUrls: [...addParams.blockExplorerUrls],
          },
        ],
      });
      return;
    }
    throw error;
  }
}
