import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePerf, type PerfMode } from "@/lib/perf";
import { initSoundPreference, isSoundEnabled, onSoundChange, setSoundEnabled } from "@/lib/sound";
import { EASE } from "@/lib/motion";

const MODES: PerfMode[] = ["auto", "high", "reduced"];

/** Quiet system panel: motion budget and optional mechanical sound. */
export function SystemControls() {
  const { mode, tier, setMode } = usePerf();
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    initSoundPreference();
    setSound(isSoundEnabled());
    return onSoundChange(setSound);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-50 hidden select-none md:block">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: EASE.expoOut }}
            className="mb-2 w-[212px] border border-border bg-background/85 p-3 backdrop-blur-md"
          >
            <p className="mt-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
              Motion budget
            </p>
            <div className="mt-2 flex gap-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`mt-mono flex-1 border px-1.5 py-1 text-[9px] uppercase tracking-[0.16em] transition-colors ${
                    mode === m
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <p className="mt-mono mt-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Running · <span className="text-foreground">{tier}</span>
            </p>

            <button
              type="button"
              onClick={() => setSoundEnabled(!sound)}
              aria-pressed={sound}
              className="mt-mono mt-3 flex w-full items-center justify-between border border-border px-2 py-1.5 text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Interaction sound
              <span className={sound ? "text-primary" : "text-muted-foreground"}>
                {sound ? "on" : "off"}
              </span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-mono flex items-center gap-2 border border-border bg-background/70 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-md transition-colors hover:text-foreground"
      >
        <span
          className={`size-1.5 rounded-full ${tier === "high" ? "bg-primary" : "bg-muted-foreground"}`}
        />
        System
      </button>
    </div>
  );
}
