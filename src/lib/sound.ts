/**
 * Optional mechanical interaction sound. OFF by default and never autoplayed —
 * the AudioContext is only created after a user gesture enables it.
 */

export type Cue = "inspect" | "verify" | "approve" | "reject";

const KEY = "mt.sound";
let ctx: AudioContext | null = null;
let enabled = false;
const listeners = new Set<(on: boolean) => void>();

export function isSoundEnabled() {
  return enabled;
}

export function initSoundPreference() {
  if (typeof window === "undefined") return;
  enabled = window.localStorage.getItem(KEY) === "1";
  listeners.forEach((l) => l(enabled));
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Must be called from a user gesture so the browser allows audio. */
export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (on && !ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = AC ? new AC() : null;
  }
  void ctx?.resume();
  listeners.forEach((l) => l(on));
}

const CUES: Record<
  Cue,
  { f: number; to: number; dur: number; type: OscillatorType; gain: number }
> = {
  inspect: { f: 880, to: 1180, dur: 0.05, type: "square", gain: 0.012 },
  verify: { f: 520, to: 1040, dur: 0.12, type: "triangle", gain: 0.02 },
  approve: { f: 320, to: 760, dur: 0.22, type: "sine", gain: 0.03 },
  reject: { f: 240, to: 120, dur: 0.18, type: "sawtooth", gain: 0.022 },
};

/** Short, dry, mechanical. No-ops unless the user turned sound on. */
export function play(cue: Cue) {
  if (!enabled || !ctx) return;
  const { f, to, dur, type, gain } = CUES[cue];
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}
