import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/navigation/SiteNav";
import { Shell, Eyebrow, Reveal, DemoTag, StatusDot } from "@/components/primitives";
import { demoMachine, auditTrail } from "@/data/demoMachine";

const title = "Explorer — Machine Trust machine asset MT-000042";
const description =
  "Inspect the canonical demo machine asset: identity, ownership state and the full compliance-verified event history.";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Explorer,
});

function Explorer() {
  return (
    <>
      <SiteNav />
      <main className="pt-28 pb-28">
        <Shell>
          <Reveal>
            <Eyebrow index="EX">Machine explorer</Eyebrow>
            <h1 className="mt-6 text-[length:var(--text-display)] font-medium leading-[1.02]">
              {demoMachine.id}
            </h1>
            <p className="mt-4 text-[15px] text-muted-foreground">
              {demoMachine.model} · serial {demoMachine.serial}
            </p>
            <DemoTag className="mt-6" />
          </Reveal>

          <Reveal delay={0.1}>
            <dl className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Owner", demoMachine.currentOwner],
                ["Status", demoMachine.status],
                ["Settlement network", "Monad"],
                ["Events", `${demoMachine.provenanceEvents}`],
              ].map(([k, v]) => (
                <div key={k} className="bg-background px-5 py-6">
                  <dt className="mt-label">{k}</dt>
                  <dd className="mt-mono mt-2 text-[13px]">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.16}>
            <ol className="mt-16 relative pl-6">
              <span
                className="absolute left-[3px] top-2 bottom-2 w-px bg-border"
                aria-hidden="true"
              />
              {auditTrail.map((e) => (
                <li key={e.time} className="relative pb-9 last:pb-0">
                  <span className="absolute -left-6 top-1.5 size-[7px] rounded-full bg-primary" />
                  <p className="mt-mono text-[11px] text-muted-foreground">{e.time}</p>
                  <p className="mt-1.5 text-[15px]">{e.action}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{e.entity}</p>
                  <p className="mt-mono mt-2 flex flex-wrap items-center gap-2 text-[11px] text-primary">
                    <StatusDot tone="ok" /> {e.verification} · {e.tx}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.2}>
            <Link
              to="/"
              className="mt-16 inline-flex border border-border px-5 py-3 text-[13px] transition-colors hover:border-foreground"
            >
              ← Back to Machine Trust
            </Link>
          </Reveal>
        </Shell>
      </main>
    </>
  );
}
