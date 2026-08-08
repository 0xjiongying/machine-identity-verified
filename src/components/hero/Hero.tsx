import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Shell, DemoTag } from "@/components/primitives";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { EASE, lineReveal } from "@/lib/motion";
import { MachineTwin } from "./MachineTwin";

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE.expoOut },
});

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  return (
    <section
      ref={ref}
      id="hero"
      className="relative overflow-hidden pb-24 pt-28 md:pb-32 md:pt-36"
      aria-label="MachineTrust introduction"
    >
      <div
        className="mt-grid-bg pointer-events-none absolute inset-0 -z-10 opacity-40"
        aria-hidden="true"
      />
      <Shell>
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          <motion.div style={{ y: copyY, opacity: copyOpacity }} className="order-1 lg:order-1">
            <motion.div {...rise(0.15)} className="flex flex-wrap items-center gap-3">
              <span className="mt-mono border border-border px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                RWA · Machine infrastructure
              </span>
              <DemoTag />
            </motion.div>

            <h1 className="mt-8 text-[length:var(--text-hero)] font-medium leading-[0.95] tracking-[-0.04em]">
              <span className="block overflow-hidden pb-[0.06em]">
                <motion.span className="block" {...lineReveal(0.3)}>
                  Trust the machine.
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.06em]">
                <motion.span className="block text-muted-foreground" {...lineReveal(0.44)}>
                  Program the asset.
                </motion.span>
              </span>
            </h1>

            <motion.p
              {...rise(0.56)}
              className="mt-7 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground"
            >
              MachineTrust connects physical machine identity, provenance and ownership with
              compliance-aware on-chain transactions.
            </motion.p>

            <motion.div {...rise(0.68)} className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton href="#passport" cursor="inspect">
                Explore Machine
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </MagneticButton>
              <MagneticButton href="#architecture" variant="outline">
                View Architecture
              </MagneticButton>
            </motion.div>

            <motion.dl
              {...rise(0.82)}
              className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-border pt-6"
            >
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
          </motion.div>

          <div className="order-2 lg:order-2">
            <MachineTwin />
          </div>
        </div>
      </Shell>
    </section>
  );
}
