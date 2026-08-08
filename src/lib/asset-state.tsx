import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { issuer } from "@/data/demoParticipants";

export type LedgerEvent = {
  id: string;
  label: string;
  detail: string;
  timestamp: string;
  hash: string;
  kind: "registered" | "maintained" | "verified" | "issued" | "transferred";
};

type AssetState = {
  owner: string;
  ownerWallet: string;
  previousOwner: string | null;
  verified: boolean;
  issued: boolean;
  extraEvents: LedgerEvent[];
  settleTransfer: (to: { name: string; wallet: string }, hash: string) => void;
  markVerified: () => void;
  markIssued: (detail?: { tokenId: string; txRef: string }) => void;
};

const Ctx = createContext<AssetState | null>(null);

/**
 * One source of truth for the machine's live state. A completed transfer is a
 * consequence, not a screen: ownership, the passport and the audit trail all
 * read from here and update together.
 */
export function AssetStateProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState(issuer.name);
  const [ownerWallet, setOwnerWallet] = useState(issuer.wallet);
  const [previousOwner, setPreviousOwner] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [issued, setIssued] = useState(false);
  const [extraEvents, setExtraEvents] = useState<LedgerEvent[]>([]);

  const settleTransfer = useCallback(
    (to: { name: string; wallet: string }, hash: string) => {
      setPreviousOwner((prev) => {
        void prev;
        return owner;
      });
      setOwner(to.name);
      setOwnerWallet(to.wallet);
      setExtraEvents((prev) =>
        prev.some((e) => e.hash === hash)
          ? prev
          : [
              ...prev,
              {
                id: `transfer-${hash.slice(2, 8)}`,
                label: "Compliant transfer",
                detail: `Ownership moved to ${to.name} after Cleanverse policy approval.`,
                timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
                hash,
                kind: "transferred",
              },
            ],
      );
    },
    [owner],
  );

  const markIssued = useCallback((detail?: { tokenId: string; txRef: string }) => {
    setIssued(true);
    if (!detail) return;
    setExtraEvents((prev) =>
      prev.some((e) => e.hash === detail.txRef)
        ? prev
        : [
            ...prev,
            {
              id: `issue-${detail.txRef.slice(-6)}`,
              label: "A-Token bound · RWA issued",
              detail: `CVA A-Token ${detail.tokenId} bound after CVI + CCP approval.`,
              timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
              hash: detail.txRef,
              kind: "issued",
            },
          ],
    );
  }, []);

  const value = useMemo<AssetState>(
    () => ({
      owner,
      ownerWallet,
      previousOwner,
      verified,
      issued,
      extraEvents,
      settleTransfer,
      markVerified: () => setVerified(true),
      markIssued,
    }),
    [owner, ownerWallet, previousOwner, verified, issued, extraEvents, settleTransfer, markIssued],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssetState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAssetState must be used inside AssetStateProvider");
  return ctx;
}
