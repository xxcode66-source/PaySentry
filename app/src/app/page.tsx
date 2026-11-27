import { Hero } from "@/components/landing/Hero";
import { Nav } from "@/components/landing/Nav";
import { BuiltOn, CTA, Features, HowItWorks, Problem, SDKSection } from "@/components/landing/Sections";
import { Footer } from "@/components/landing/Footer";
import { AuroraBackground } from "@/components/shared/AuroraBackground";

export default function LandingPage() {
  return (
    <div className="relative">
      <AuroraBackground />
      <div className="relative">
        <Nav />
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <BuiltOn />
        <SDKSection />
        <CTA />
        <Footer />
      </div>
    </div>
  );
}
