import { motion } from "motion/react";
import { Shell, DemoTag } from "@/components/primitives";
import { MachinePlate } from "./MachinePlate";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
});

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-28 md:pb-32 md:pt-36" aria-label="MachineTrust introduction">
      <div className="mt-grid-bg pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
      <Shell>
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <div className="order-2 lg:order-1">
            <motion.div {...rise(0.15)} className="flex flex-wrap items-center gap-3">
              <span className="mt-mono border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                RWA · Machine infrastructure
              </span>
              <DemoTag />
            </motion.div>

            <h1 className="mt-8 text-[length:var(--text-hero)] font-medium leading-[0.95] tracking-[-0.04em]">
              <motion.span className="block" {...rise(0.3)}>
                Trust the machine.
              </motion.span>
              <motion.span className="block text-muted-foreground" {...rise(0.42)}>
                Program the asset.
              </motion.span>
            </h1>

            <motion.p {...rise(0.56)} className="mt-7 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
              MachineTrust connects physical machine identity, provenance and ownership with
              compliance-aware on-chain transactions.
            </motion.p>

            <motion.div {...rise(0.68)} className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#passport"
                data-cursor="inspect"
                className="group inline-flex items-center gap-3 border border-foreground bg-foreground px-5 py-3 text-[13px] font-medium text-background transition-colors hover:border-primary hover:bg-primary"
              >
                Explore Machine
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#architecture"
                className="inline-flex items-center gap-3 border border-border px-5 py-3 text-[13px] text-foreground transition-colors hover:border-foreground"
              >
                View Architecture
              </a>
            </motion.div>

            <motion.dl {...rise(0.82)} className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6">
              {[
                ["Layer 01", "MachineTrust"],
                ["Layer 02", "Cleanverse"],
                ["Layer 03", "Monad"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="mt-label">{k}</dt>
                  <dd className="mt-1.5 text-[13px] text-foreground">{v}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <div className="order-1 lg:order-2">
            <MachinePlate />
          </div>
        </div>
      </Shell>
    </section>
  );
}
