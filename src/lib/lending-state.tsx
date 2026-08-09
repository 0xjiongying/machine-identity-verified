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
  authorizeCvi,
  fetchCreditMarketConfig,
  fetchCreditPosition,
  fetchTrack2Eligibility,
  openCredit,
  type CreditMarketConfig,
} from "@/lib/lending-adapter";
import type { CreditPosition, EligibilityDecision } from "@/lib/lending/types";
import { LENDING_WALLETS, type LendingWalletId } from "@/data/lendingWallets";
import { useWallet } from "@/lib/wallet/wallet-state";

type LendingState = {
  selectedWalletId: LendingWalletId;
  setSelectedWalletId: (id: LendingWalletId) => void;
  /** Address used for CVI / MachineTrust / DeFi eligibility (connected wallet preferred). */
  walletAddress: string;
  /** True when Track 2 is bound to the live EIP-1193 wallet. */
  usingConnectedWallet: boolean;
  eligibility: EligibilityDecision | null;
  position: CreditPosition | null;
  config: CreditMarketConfig | null;
  amountMon: string;
  setAmountMon: (v: string) => void;
  loading: boolean;
  acting: boolean;
  error: string | null;
  lastTxHash: string | null;
  lastExplorerUrl: string | null;
  lastAction: string | null;
  refresh: () => Promise<void>;
  runAuthorizeCvi: () => Promise<void>;
  runOpenCredit: () => Promise<void>;
};

const Ctx = createContext<LendingState | null>(null);

export function LendingProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [selectedWalletId, setSelectedWalletId] = useState<LendingWalletId>("verifiedBuyer");
  const [eligibility, setEligibility] = useState<EligibilityDecision | null>(null);
  const [position, setPosition] = useState<CreditPosition | null>(null);
  const [config, setConfig] = useState<CreditMarketConfig | null>(null);
  const [amountMon, setAmountMon] = useState("0.01");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastExplorerUrl, setLastExplorerUrl] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const usingConnectedWallet = Boolean(wallet.address);
  const walletAddress = wallet.address ?? LENDING_WALLETS[selectedWalletId].address;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, p, c] = await Promise.all([
        fetchTrack2Eligibility(walletAddress),
        fetchCreditPosition(walletAddress),
        fetchCreditMarketConfig(),
      ]);
      setEligibility(e);
      setPosition(p);
      setConfig(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Track 2 state");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Disconnect clears last tx UI belonging to previous session
  useEffect(() => {
    if (!wallet.address) {
      setLastTxHash(null);
      setLastExplorerUrl(null);
      setLastAction(null);
    }
  }, [wallet.address]);

  const runAuthorizeCvi = useCallback(async () => {
    if (wallet.address && !wallet.onMonadTestnet) {
      setError("Switch to Monad Testnet before authorizing CVI on-chain.");
      return;
    }
    setActing(true);
    setError(null);
    try {
      const result = await authorizeCvi(walletAddress);
      setLastTxHash(result.txHash);
      setLastExplorerUrl(
        result.txHash ? `https://testnet.monadvision.com/tx/${result.txHash}` : null,
      );
      setLastAction("setCviEligible");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "CVI authorization failed");
      setLastTxHash(null);
      setLastExplorerUrl(null);
    } finally {
      setActing(false);
    }
  }, [wallet.address, wallet.onMonadTestnet, walletAddress, refresh]);

  const runOpenCredit = useCallback(async () => {
    if (wallet.address && !wallet.onMonadTestnet) {
      setError("Switch to Monad Testnet before opening a credit deposit.");
      return;
    }
    setActing(true);
    setError(null);
    try {
      const result = await openCredit(walletAddress, amountMon);
      if (!result.ok) {
        setError(result.error ?? result.notice);
        setLastTxHash(null);
        setLastExplorerUrl(null);
        setEligibility(result.eligibility);
        return;
      }
      setLastTxHash(result.txHash ?? null);
      setLastExplorerUrl(result.explorerUrl ?? null);
      setLastAction("openCreditDeposit");
      setEligibility(result.eligibility);
      if (result.position) setPosition(result.position);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit deposit rejected");
      setLastTxHash(null);
      setLastExplorerUrl(null);
    } finally {
      setActing(false);
    }
  }, [wallet.address, wallet.onMonadTestnet, walletAddress, amountMon, refresh]);

  const value = useMemo(
    () => ({
      selectedWalletId,
      setSelectedWalletId,
      walletAddress,
      usingConnectedWallet,
      eligibility,
      position,
      config,
      amountMon,
      setAmountMon,
      loading,
      acting,
      error,
      lastTxHash,
      lastExplorerUrl,
      lastAction,
      refresh,
      runAuthorizeCvi,
      runOpenCredit,
    }),
    [
      selectedWalletId,
      walletAddress,
      usingConnectedWallet,
      eligibility,
      position,
      config,
      amountMon,
      loading,
      acting,
      error,
      lastTxHash,
      lastExplorerUrl,
      lastAction,
      refresh,
      runAuthorizeCvi,
      runOpenCredit,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLending() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLending must be used within LendingProvider");
  return ctx;
}
