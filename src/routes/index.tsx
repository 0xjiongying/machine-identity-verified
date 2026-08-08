import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/navigation/SiteNav";
import { Hero } from "@/components/hero/Hero";
import { TrustGap } from "@/components/sections/TrustGap";
import { Passport } from "@/components/passport/Passport";
import { Participants } from "@/components/sections/Participants";
import { Issuance } from "@/components/compliance/Issuance";
import { Transfer } from "@/components/transfer/Transfer";
import { AuditTrail } from "@/components/sections/AuditTrail";
import { Architecture } from "@/components/architecture/Architecture";
import { ThreeLayer } from "@/components/sections/ThreeLayer";
import { Scale } from "@/components/sections/Scale";
import { ValueModules } from "@/components/sections/ValueModules";
import { Roadmap } from "@/components/sections/Roadmap";
import { FooterCTA } from "@/components/footer/FooterCTA";

const title = "MachineTrust — Trust the machine. Program the asset.";
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
      <main id="main">
        <h1 className="sr-only">
          MachineTrust — compliance infrastructure for programmable machine assets
        </h1>
        <Hero />
        <TrustGap />
        <Passport />
        <Participants />
        <Issuance />
        <Transfer />
        <AuditTrail />
        <Architecture />
        <ThreeLayer />
        <Scale />
        <ValueModules />
        <Roadmap />
      </main>
      <FooterCTA />
    </>
  );
}
