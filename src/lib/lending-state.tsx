/* Context module: provider + hook co-located by design. */
/* eslint-disable react-refresh/only-export-components */
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
  confirmBorrow,
  confirmRepay,
  fetchLendingMode,
  fetchPool,
  requestEligibility,
  requestFinancing,
  type EligibilityDecision,
  type LoanRecord,
  type PoolSnapshot,
} from "@/lib/lending-adapter";
import type { FinancingVisual } from "@/lib/lending/types";
import { DEMO_WALLETS, type DemoWallet, type DemoWalletKey } from "@/data/lendingWallets";

type LendingState = {
  mode: "demo" | "live";
  deployedAddress: string | null;
  connected: DemoWallet | null;
  eligibility: EligibilityDecision | null;
  checking: boolean;
  pool: PoolSnapshot | null;
  loan: LoanRecord | null;
  stage:
    | "CONNECT"
    | "VERIFY_IDENTITY"
    | "BLOCKED"
    | "ELIGIBLE"
    | "ENTER_POOL"
    | "REQUEST_LOAN"
    | "APPROVE"
    | "BORROW"
    | "REPAY"
    | "CLOSED";
  financingVisual: FinancingVisual;
  notice: string | null;
  connect: (key: DemoWalletKey) => void;
  disconnect: () => void;
  checkEligibility: () => Promise<void>;
  requestLoan: (principal: number) => Promise<void>;
  activateLoan: () => Promise<void>;
  repayLoan: () => Promise<void>;
  refreshPool: () => Promise<void>;
};

const Ctx = createContext<LendingState | null>(null);

export function LendingProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState<DemoWallet | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityDecision | null>(null);
  const [checking, setChecking] = useState(false);
  const [pool, setPool] = useState<PoolSnapshot | null>(null);
  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetchLendingMode().then((m) => {
      setMode(m.mode);
      setDeployedAddress(m.deployedAddress);
    });
    void fetchPool().then(setPool);
  }, []);

  const financingVisual: FinancingVisual = useMemo(() => {
    if (loan?.status === "closed" || loan?.status === "repaid") return "closed";
    if (loan?.status === "active") return "active";
    if (eligibility?.eligible) return "enabled";
    return "restricted";
  }, [eligibility, loan]);

  const stage = useMemo<LendingState["stage"]>(() => {
    if (!connected) return "CONNECT";
    if (checking) return "VERIFY_IDENTITY";
    if (eligibility && !eligibility.eligible) return "BLOCKED";
    if (loan?.status === "closed" || loan?.status === "repaid") return "CLOSED";
    if (loan?.status === "active") return "REPAY";
    if (loan?.status === "requested") return "APPROVE";
    if (eligibility?.eligible) return loan ? "REQUEST_LOAN" : "ENTER_POOL";
    return "CONNECT";
  }, [connected, checking, eligibility, loan]);

  const connect = useCallback((key: DemoWalletKey) => {
    const w = DEMO_WALLETS.find((d) => d.key === key) ?? null;
    setConnected(w);
    setEligibility(null);
    setLoan(null);
    setNotice(w ? `Connected ${w.name} · ${w.wallet.slice(0, 10)}…` : null);
  }, []);

  const disconnect = useCallback(() => {
    setConnected(null);
    setEligibility(null);
    setLoan(null);
    setNotice(null);
  }, []);

  const refreshPool = useCallback(async () => {
    setPool(await fetchPool());
  }, []);

  const checkEligibilityFn = useCallback(async () => {
    if (!connected) return;
    setChecking(true);
    setNotice("Running Cleanverse CVI → CCP eligibility…");
    try {
      const decision = await requestEligibility(connected.wallet);
      setEligibility(decision);
      setNotice(decision.notice);
      await refreshPool();
    } finally {
      setChecking(false);
    }
  }, [connected, refreshPool]);

  const requestLoanFn = useCallback(
    async (principal: number) => {
      if (!connected || !eligibility?.eligible) {
        setNotice("Loan blocked — borrower is not eligible.");
        return;
      }
      const res = await requestFinancing({
        wallet: connected.wallet,
        borrowerName: connected.name,
        principal,
        passportId: "MT-000042",
      });
      setPool(res.pool);
      if (res.eligibility) setEligibility(res.eligibility);
      if (res.ok && res.loan) {
        setLoan(res.loan);
        setNotice(res.notice);
      } else {
        setNotice(res.error ?? res.notice);
      }
    },
    [connected, eligibility],
  );

  const activateLoanFn = useCallback(async () => {
    if (!connected || !loan) return;
    const res = await confirmBorrow(connected.wallet, loan.id);
    setPool(res.pool);
    if (res.eligibility) setEligibility(res.eligibility);
    if (res.ok && res.loan) {
      setLoan(res.loan);
      setNotice(res.notice);
    } else {
      setNotice(res.error ?? res.notice);
    }
  }, [connected, loan]);

  const repayLoanFn = useCallback(async () => {
    if (!connected || !loan) return;
    const res = await confirmRepay(connected.wallet, loan.id);
    setPool(res.pool);
    if (res.ok && res.loan) {
      setLoan(res.loan);
      setNotice(res.notice);
    } else {
      setNotice(res.error ?? res.notice);
    }
  }, [connected, loan]);

  const value = useMemo<LendingState>(
    () => ({
      mode,
      deployedAddress,
      connected,
      eligibility,
      checking,
      pool,
      loan,
      stage,
      financingVisual,
      notice,
      connect,
      disconnect,
      checkEligibility: checkEligibilityFn,
      requestLoan: requestLoanFn,
      activateLoan: activateLoanFn,
      repayLoan: repayLoanFn,
      refreshPool,
    }),
    [
      mode,
      deployedAddress,
      connected,
      eligibility,
      checking,
      pool,
      loan,
      stage,
      financingVisual,
      notice,
      connect,
      disconnect,
      checkEligibilityFn,
      requestLoanFn,
      activateLoanFn,
      repayLoanFn,
      refreshPool,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLending() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLending must be used inside LendingProvider");
  return ctx;
}
