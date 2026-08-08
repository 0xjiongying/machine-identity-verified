import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/navigation/SiteNav";
import { ProgressRail } from "@/components/navigation/ProgressRail";
import { Hero } from "@/components/hero/Hero";
import { Overview } from "@/components/sections/Overview";
import { TrustGap } from "@/components/sections/TrustGap";
import { Inspection } from "@/components/sections/Inspection";
import { MachineTrustModule } from "@/components/trust/MachineTrustModule";
import { Passport } from "@/components/passport/Passport";
import { Lifecycle } from "@/components/sections/Lifecycle";
import { Participants } from "@/components/sections/Participants";
import { LendingMarket } from "@/components/defi/LendingMarket";
import { AuditTrail } from "@/components/sections/AuditTrail";
import { Architecture } from "@/components/architecture/Architecture";
import { Scale } from "@/components/sections/Scale";
import { Roadmap } from "@/components/sections/Roadmap";
import { FooterCTA } from "@/components/footer/FooterCTA";
import { DemoPath } from "@/components/demo/DemoPath";

const title = "Machine Trust — Finance machines. Verify the borrower.";
const description =
  "CVI-gated Compliant DeFi for machine financing: Cleanverse identity verification unlocks a USDC lending pool; Monad executes the loan.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <>
      <SiteNav />
      <ProgressRail />
      <DemoPath />
      <main id="main">
        <h1 className="sr-only">
          Machine Trust — verified identity unlocks compliant machine finance
        </h1>
        <Hero />
        <Overview />
        <TrustGap />
        <Inspection />
        <MachineTrustModule />
        <Passport />
        <Lifecycle />
        <Participants />
        <LendingMarket />
        <AuditTrail />
        <Architecture />
        <Scale />
        <Roadmap />
      </main>
      <FooterCTA />
    </>
  );
}
