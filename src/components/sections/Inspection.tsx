import { lazy, Suspense, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Section, Shell, Eyebrow, Heading, Reveal, DemoTag } from "@/components/primitives";
import { machineComponents, type ComponentKey } from "@/data/machineComponents";
import { demoMachine } from "@/data/demoMachine";
import { usePerf } from "@/lib/perf";
import { useHydrated, useReducedMotion } from "@/hooks/useMotionPrefs";
import { play } from "@/lib/sound";

const InspectorScene = lazy(() => import("@/components/inspect/InspectorScene"));

const ease = [0.16, 1, 0.3, 1] as const;

export function Inspection() {
  const { tier } = usePerf();
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  const controls = useRef<OrbitControlsImpl | null>(null);

  const [hovered, setHovered] = useState<ComponentKey | null>(null);
  const [selected, setSelected] = useState<ComponentKey | null>(null);
  const [explode, setExplode] = useState(0);
  const [wireframe, setWireframe] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [engaged, setEngaged] = useState(false);

  const active = machineComponents.find((c) => c.key === (selected ?? hovered)) ?? null;

  function select(k: ComponentKey | null) {
    setSelected(k);
    if (k) {
      setAutoRotate(false);
      play("inspect");
    }
  }

  function zoom(dir: 1 | -1) {
    const c = controls.current;
    if (!c) return;
    if (dir === 1) c.dollyIn?.(1.12);
    else c.dollyOut?.(1.12);
    c.update();
  }

  return (
    <Section id="inspect" label="Interactive machine inspection">
      <Shell>
        <Reveal>
          <Eyebrow index="02">Machine inspection</Eyebrow>
          <Heading>Rotate it. Take it apart. Read its record.</Heading>
          <p className="mt-5 max-w-[52ch] text-[15px] text-muted-foreground">
            Drag to orbit the machine, separate the assembly and open any component. Every part maps
            to an entry in the Machine Passport.
          </p>
          <DemoTag className="mt-6" />
        </Reveal>

        <div className="mt-12 grid gap-px border border-border bg-border lg:grid-cols-[1.55fr_1fr]">
          {/* viewport */}
          <div
            className="relative aspect-[4/3] bg-background sm:aspect-[16/10] lg:aspect-auto lg:min-h-[560px]"
            onPointerDown={() => setEngaged(true)}
          >
            {hydrated ? (
              <Suspense fallback={<ViewportFallback />}>
                <InspectorScene
                  explode={explode}
                  wireframe={wireframe}
                  hovered={hovered}
                  selected={selected}
                  autoRotate={autoRotate && !reduced}
                  zoomEnabled={engaged}
                  tier={tier}
                  onHover={setHovered}
                  onSelect={select}
                  controlsRef={controls}
                />
              </Suspense>
            ) : (
              <ViewportFallback />
            )}

            {/* HUD */}
            <div className="pointer-events-none absolute inset-0 p-5">
              <div className="mt-mono flex items-start justify-between text-[10px] text-muted-foreground">
                <span>{demoMachine.id} · LIVE VIEWPORT</span>
                <span>{engaged ? "ZOOM ACTIVE" : "CLICK TO ENGAGE ZOOM"}</span>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 border-t border-border bg-background/85 p-3 backdrop-blur-sm">
              <Control onClick={() => setAutoRotate((v) => !v)} on={autoRotate}>
                Auto-rotate
              </Control>
              <Control onClick={() => setWireframe((v) => !v)} on={wireframe}>
                Wireframe
              </Control>
              <Control onClick={() => zoom(1)}>Zoom +</Control>
              <Control onClick={() => zoom(-1)}>Zoom −</Control>
              <Control
                onClick={() => {
                  controls.current?.reset();
                  setExplode(0);
                  setSelected(null);
                  setAutoRotate(true);
                }}
              >
                Reset
              </Control>
              <label className="ml-auto flex min-w-[168px] flex-1 items-center gap-3">
                <span className="mt-mono text-[10px] text-muted-foreground">EXPLODE</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explode}
                  aria-label="Exploded view amount"
                  onChange={(e) => setExplode(Number(e.target.value))}
                  className="h-px flex-1 cursor-ew-resize appearance-none bg-border accent-primary"
                />
                <span className="mt-mono w-8 text-right text-[10px] text-primary">
                  {Math.round(explode * 100)}%
                </span>
              </label>
            </div>
          </div>

          {/* data panel */}
          <div className="flex flex-col bg-background">
            <ul className="grid gap-px bg-border">
              {machineComponents.map((c) => {
                const on = selected === c.key || hovered === c.key;
                return (
                  <li key={c.key} className="bg-background">
                    <button
                      type="button"
                      onPointerEnter={() => setHovered(c.key)}
                      onPointerLeave={() => setHovered(null)}
                      onClick={() => select(selected === c.key ? null : c.key)}
                      aria-pressed={selected === c.key}
                      className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors ${
                        on ? "bg-primary/[0.07]" : "hover:bg-foreground/[0.03]"
                      }`}
                    >
                      <span
                        className={`mt-mono text-[10px] ${on ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {c.index}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px]">{c.name}</span>
                      <span className="mt-mono truncate text-[10px] text-muted-foreground">
                        {c.partId}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="relative min-h-[280px] flex-1 border-t border-border p-6">
              <AnimatePresence mode="wait">
                {active ? (
                  <motion.div
                    key={active.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.42, ease }}
                  >
                    <p className="mt-mono text-[10px] text-primary">
                      {active.index} · {active.partId}
                    </p>
                    <h3 className="mt-3 text-[22px] font-medium">{active.name}</h3>
                    <p className="mt-3 text-[14px] text-muted-foreground">{active.summary}</p>
                    <dl className="mt-6 grid gap-px bg-border">
                      {active.specs.map((s) => (
                        <div key={s.label} className="flex gap-4 bg-background py-2.5">
                          <dt className="mt-label min-w-0 flex-1">{s.label}</dt>
                          <dd className="mt-mono min-w-0 text-right text-[11px] break-words">
                            {s.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-mono mt-6 text-[10px] text-muted-foreground">
                      PASSPORT LINK — {active.passport}
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[14px] text-muted-foreground"
                  >
                    Select a component — in the list or directly on the machine — to read its
                    technical record.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </Shell>
    </Section>
  );
}

function Control({
  children,
  onClick,
  on,
}: {
  children: React.ReactNode;
  onClick: () => void;
  on?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`mt-mono border px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase transition-colors ${
        on
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ViewportFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <span className="mt-mono text-[10px] text-muted-foreground">LOADING MACHINE GEOMETRY…</span>
    </div>
  );
}
