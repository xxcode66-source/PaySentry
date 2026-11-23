import { Hero } from "@/components/landing/Hero";
import { Nav } from "@/components/landing/Nav";
import { BuiltOn, CTA, Features, HowItWorks, Problem, SDKSection } from "@/components/landing/Sections";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
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
  );
}
