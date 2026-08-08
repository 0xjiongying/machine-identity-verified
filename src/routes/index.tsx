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
import { Credentials } from "@/components/sections/Credentials";
import { Issuance } from "@/components/compliance/Issuance";
import { Transfer } from "@/components/transfer/Transfer";
import { AuditTrail } from "@/components/sections/AuditTrail";
import { Architecture } from "@/components/architecture/Architecture";
import { Scale } from "@/components/sections/Scale";
import { Roadmap } from "@/components/sections/Roadmap";
import { FooterCTA } from "@/components/footer/FooterCTA";
import { DemoPath } from "@/components/demo/DemoPath";

const title = "Machine Trust — Trust the machine. Program the asset.";
const description =
  "Machine passports, verified participants and compliance-aware transfers that turn industrial machines into programmable on-chain assets.";

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
          Machine Trust — compliance infrastructure for programmable machine assets
        </h1>
        <Hero />
        <Overview />
        <TrustGap />
        <Inspection />
        <MachineTrustModule />
        <Passport />
        <Lifecycle />
        <Participants />
        <Credentials />
        <Issuance />
        <Transfer />
        <AuditTrail />
        <Architecture />
        <Scale />
        <Roadmap />
      </main>
      <FooterCTA />
    </>
  );
}
