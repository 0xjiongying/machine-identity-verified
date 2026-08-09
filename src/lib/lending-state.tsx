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

type LendingState = {
  selectedWalletId: LendingWalletId;
  setSelectedWalletId: (id: LendingWalletId) => void;
  walletAddress: string;
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
  const [selectedWalletId, setSelectedWalletId] =
    useState<LendingWalletId>("verifiedBuyer");
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

  const walletAddress = LENDING_WALLETS[selectedWalletId].address;

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

  const runAuthorizeCvi = useCallback(async () => {
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
  }, [walletAddress, refresh]);

  const runOpenCredit = useCallback(async () => {
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
  }, [walletAddress, amountMon, refresh]);

  const value = useMemo(
    () => ({
      selectedWalletId,
      setSelectedWalletId,
      walletAddress,
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
