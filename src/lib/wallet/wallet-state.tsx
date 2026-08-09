import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getInjectedProvider,
  readAccounts,
  readChainId,
  requestAccounts,
  switchToMonadTestnet,
  walletErrorMessage,
  type InjectedProvider,
} from "@/lib/wallet/eip1193";
import {
  isMonadTestnet,
  MONAD_CHAIN_ID,
  MONAD_WALLET_CHAIN,
  shortAddress,
} from "@/lib/wallet/monad-chain";

export type WalletStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong_network"
  | "switching"
  | "error"
  | "unavailable";

type WalletState = {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  onMonadTestnet: boolean;
  shortAddr: string | null;
  error: string | null;
  hasProvider: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  retry: () => Promise<void>;
};

const Ctx = createContext<WalletState | null>(null);

function normalizeAddress(value: string | undefined | null): string | null {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  const applySession = useCallback((nextAddress: string | null, nextChainId: number | null) => {
    setAddress(nextAddress);
    setChainId(nextChainId);
    if (!nextAddress) {
      setStatus("disconnected");
      return;
    }
    setStatus(isMonadTestnet(nextChainId) ? "connected" : "wrong_network");
  }, []);

  const syncFromProvider = useCallback(
    async (provider: InjectedProvider) => {
      const [accounts, id] = await Promise.all([readAccounts(provider), readChainId(provider)]);
      applySession(normalizeAddress(accounts[0] ?? null), id);
    },
    [applySession],
  );

  useEffect(() => {
    const provider = getInjectedProvider();
    setHasProvider(Boolean(provider));
    if (!provider) {
      // Keep disconnected UX ("Connect Wallet") — click surfaces the unavailable message.
      setStatus("disconnected");
      return;
    }

    void syncFromProvider(provider).catch(() => {
      /* silent on boot */
    });

    const onAccounts = (...args: unknown[]) => {
      const accounts = (args[0] as string[] | undefined) ?? [];
      const next = normalizeAddress(accounts[0] ?? null);
      if (!next) {
        applySession(null, null);
        setError(null);
        return;
      }
      void readChainId(provider)
        .then((id) => applySession(next, id))
        .catch(() => applySession(next, null));
    };
    const onChain = (...args: unknown[]) => {
      const hex = args[0] as string | undefined;
      if (!hex) return;
      const id = Number.parseInt(hex, 16);
      setChainId(id);
      setAddress((current) => {
        if (!current) {
          setStatus("disconnected");
          return current;
        }
        setStatus(isMonadTestnet(id) ? "connected" : "wrong_network");
        return current;
      });
    };

    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [syncFromProvider, applySession]);

  const connect = useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      setHasProvider(false);
      setStatus("error");
      setError("No compatible wallet detected. Install MetaMask or another EIP-1193 wallet.");
      return;
    }
    setHasProvider(true);
    setStatus("connecting");
    setError(null);
    try {
      const accounts = await requestAccounts(provider);
      const next = normalizeAddress(accounts[0] ?? null);
      if (!next) {
        setStatus("disconnected");
        setError("No account returned by wallet.");
        return;
      }
      const id = await readChainId(provider);
      applySession(next, id);
    } catch (err) {
      setError(walletErrorMessage(err));
      setStatus("error");
    }
  }, [applySession]);

  const disconnect = useCallback(() => {
    setError(null);
    applySession(null, null);
    if (!getInjectedProvider()) setStatus("unavailable");
  }, [applySession]);

  const switchNetwork = useCallback(async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      setStatus("unavailable");
      setError("No compatible wallet detected.");
      return;
    }
    setStatus("switching");
    setError(null);
    try {
      await switchToMonadTestnet(provider, MONAD_WALLET_CHAIN);
      const id = await readChainId(provider);
      setChainId(id);
      setAddress((current) => {
        if (!current) {
          setStatus("disconnected");
          return current;
        }
        setStatus(isMonadTestnet(id) ? "connected" : "wrong_network");
        return current;
      });
    } catch (err) {
      setError(walletErrorMessage(err));
      setStatus((prev) => (prev === "switching" ? "wrong_network" : "error"));
    }
  }, []);

  const retry = useCallback(async () => {
    if (status === "wrong_network" || status === "switching") {
      await switchNetwork();
      return;
    }
    await connect();
  }, [status, connect, switchNetwork]);

  const value = useMemo<WalletState>(
    () => ({
      status,
      address,
      chainId,
      onMonadTestnet: isMonadTestnet(chainId),
      shortAddr: address ? shortAddress(address) : null,
      error,
      hasProvider,
      connect,
      disconnect,
      switchNetwork,
      retry,
    }),
    [status, address, chainId, error, hasProvider, connect, disconnect, switchNetwork, retry],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export { MONAD_CHAIN_ID, shortAddress };
