/**
 * Tiny store so heavy visuals (WebGL) can wait until the intro sequence has
 * finished — the loader must never compete with scene compilation.
 */
let ready = typeof window === "undefined";
const listeners = new Set<() => void>();

export function isBootComplete() {
  return ready;
}

export function markBootComplete() {
  if (ready) return;
  ready = true;
  listeners.forEach((l) => l());
}

export function onBootComplete(fn: () => void) {
  if (ready) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}
