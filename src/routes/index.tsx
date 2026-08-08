import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/navigation/SiteNav";
import { ProgressRail } from "@/components/navigation/ProgressRail";
import { Hero } from "@/components/hero/Hero";
import { TrustGap } from "@/components/sections/TrustGap";
import { Inspection } from "@/components/sections/Inspection";
import { CinematicFilm } from "@/components/media/CinematicFilm";
import { Passport } from "@/components/passport/Passport";
import { Lifecycle } from "@/components/sections/Lifecycle";
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
      <main id="main">
        <h1 className="sr-only">
          Machine Trust — compliance infrastructure for programmable machine assets
        </h1>
        <Hero />
        <TrustGap />
        <Inspection />
        <CinematicFilm caption="Machine footage — scroll-scrubbed / demo asset" />
        <Passport />
        <Lifecycle />
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
