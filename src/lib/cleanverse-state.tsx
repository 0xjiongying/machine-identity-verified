import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  counterparties as seedCounterparties,
  cvaMachine,
  cviIssuer,
  type CredentialStatus,
  type CvaCredential,
  type CviCredential,
} from "@/data/cleanverse-registry";
import {
  fetchCleanverseMode,
  unissuedToken,
  type AtokenRecord,
  type Evaluation,
} from "./cleanverse-adapter";

type CleanverseState = {
  mode: "demo" | "live";
  issuer: CviCredential;
  counterparties: CviCredential[];
  asset: CvaCredential;
  /** CVA A-Token — "unissued" until issuance runs and Cleanverse mints it. */
  aToken: AtokenRecord;
  decisions: Evaluation[];
  setCounterpartyStatus: (id: string, status: CredentialStatus) => void;
  setAttestationStatus: (code: string, status: "valid" | "expired") => void;
  setAssetStatus: (status: "active" | "suspended") => void;
  setAToken: (token: AtokenRecord) => void;
  recordDecision: (evaluation: Evaluation) => void;
};

const Ctx = createContext<CleanverseState | null>(null);

/**
 * Live credential state. Revoking a CVI or expiring a CVA attestation here
 * changes the outcome of every policy evaluation in the product — credentials
 * are inputs to the engine, not decoration.
 */
export function CleanverseProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [parties, setParties] = useState<CviCredential[]>(seedCounterparties);
  const [asset, setAsset] = useState<CvaCredential>(cvaMachine);
  const [aToken, setAToken] = useState<AtokenRecord>(() => unissuedToken(cvaMachine));
  const [decisions, setDecisions] = useState<Evaluation[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchCleanverseMode().then((m) => {
      if (alive) setMode(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  const setCounterpartyStatus = useCallback((id: string, status: CredentialStatus) => {
    setParties((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }, []);

  const setAttestationStatus = useCallback((code: string, status: "valid" | "expired") => {
    setAsset((prev) => ({
      ...prev,
      attestations: prev.attestations.map((a) => (a.code === code ? { ...a, status } : a)),
    }));
  }, []);

  const setAssetStatus = useCallback((status: "active" | "suspended") => {
    setAsset((prev) => ({ ...prev, status }));
  }, []);

  const recordDecision = useCallback((evaluation: Evaluation) => {
    setDecisions((prev) => [evaluation, ...prev].slice(0, 8));
  }, []);

  const value = useMemo<CleanverseState>(
    () => ({
      mode,
      issuer: cviIssuer,
      counterparties: parties,
      asset,
      aToken,
      decisions,
      setCounterpartyStatus,
      setAttestationStatus,
      setAssetStatus,
      setAToken,
      recordDecision,
    }),
    [
      mode,
      parties,
      asset,
      aToken,
      decisions,
      setCounterpartyStatus,
      setAttestationStatus,
      setAssetStatus,
      recordDecision,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCleanverse() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCleanverse must be used inside CleanverseProvider");
  return ctx;
}
