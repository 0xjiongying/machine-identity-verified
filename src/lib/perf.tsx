import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PerfMode = "auto" | "high" | "reduced";
export type PerfTier = "high" | "reduced";

type PerfValue = {
  mode: PerfMode;
  /** Resolved tier after auto-detection — what components should actually honour. */
  tier: PerfTier;
  setMode: (m: PerfMode) => void;
};

const Ctx = createContext<PerfValue>({ mode: "auto", tier: "reduced", setMode: () => {} });
const KEY = "mt.perf";

/** Cheap device probe: cores, memory, pointer class and motion preference. */
function detectTier(): PerfTier {
  if (typeof window === "undefined") return "reduced";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "reduced";
  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const fine = window.matchMedia("(pointer: fine)").matches;
  const wide = window.innerWidth >= 1024;
  return cores >= 4 && mem >= 4 && fine && wide ? "high" : "reduced";
}

export function PerfProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PerfMode>("auto");
  const [detected, setDetected] = useState<PerfTier>("reduced");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY) as PerfMode | null;
    if (stored === "auto" || stored === "high" || stored === "reduced") setModeState(stored);
    setDetected(detectTier());
    const onResize = () => setDetected(detectTier());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const value = useMemo<PerfValue>(
    () => ({
      mode,
      tier: mode === "auto" ? detected : mode,
      setMode: (m) => {
        setModeState(m);
        try {
          window.localStorage.setItem(KEY, m);
        } catch {
          /* storage disabled — the session default still applies */
        }
      },
    }),
    [mode, detected],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const usePerf = () => useContext(Ctx);
