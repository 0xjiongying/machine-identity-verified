import { motion } from "motion/react";
import { Section, Shell } from "@/components/primitives";

const statements = [
  { k: "What", v: "MachineTrust" },
  { k: "Who", v: "Cleanverse CVI" },
  { k: "Can", v: "Cleanverse Compliance" },
  { k: "Execute", v: "Monad", accent: true },
];

export function ThreeLayer() {
  return (
    <Section label="Three layer model" className="py-28 md:py-40">
      <Shell>
        <ul>
          {statements.map((s, i) => (
            <motion.li
              key={s.k}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-border py-8 last:border-0 md:py-10"
            >
              <p className="mt-label">{s.k}</p>
              <p
                className={
                  "mt-2 text-[length:var(--text-mega)] font-medium leading-[0.86] tracking-[-0.05em] " +
                  (s.accent ? "text-primary" : "")
                }
              >
                {s.v}
              </p>
            </motion.li>
          ))}
        </ul>
      </Shell>
    </Section>
  );
}
