import { motion } from "motion/react";
import { Section, Shell, Eyebrow, Heading, Lede, Reveal } from "@/components/primitives";

const categories = [
  { name: "Robotics", path: "M6 34 L6 20 L20 12 L34 20 L34 34" },
  { name: "CNC machinery", path: "M6 34 L6 14 L34 14 L34 34 M14 14 L14 34 M26 14 L26 34" },
  { name: "Construction", path: "M4 34 L14 12 L24 12 L36 34 M14 12 L14 34" },
  {
    name: "Logistics",
    path: "M4 28 L26 28 L26 16 L34 16 L36 28 M10 34 a3 3 0 1 0 0.1 0 M30 34 a3 3 0 1 0 0.1 0",
  },
  {
    name: "Energy",
    path: "M20 6 L20 20 M20 20 L8 30 M20 20 L32 30 M20 20 m-3 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
  },
  { name: "Industrial equipment", path: "M8 34 L8 18 L18 18 L18 10 L32 10 L32 34" },
];

export function Scale() {
  return (
    <Section label="Scale">
      <Shell>
        <Reveal>
          <Eyebrow index="09">Scale</Eyebrow>
          <Heading>Start with robots. Build for machines.</Heading>
          <Lede>Robotics is the initial wedge, not the market boundary.</Lede>
        </Reveal>

        <ul className="mt-14 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => (
            <motion.li
              key={c.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="group flex items-center gap-5 bg-background px-6 py-8 transition-colors hover:bg-surface"
            >
              <svg
                viewBox="0 0 40 40"
                className="size-10 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              >
                <path d={c.path} fill="none" stroke="currentColor" strokeWidth="1.1" />
              </svg>
              <div className="min-w-0">
                <p className="mt-label">{String(i + 1).padStart(2, "0")}</p>
                <p className="mt-1.5 truncate text-[15px] tracking-tight">{c.name}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </Shell>
    </Section>
  );
}
