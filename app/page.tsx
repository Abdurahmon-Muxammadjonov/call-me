import { LandingNavbar } from "./components/landing/LandingNavbar";
import { Hero } from "./components/landing/sections/Hero";
import { StatsBar } from "./components/landing/sections/StatsBar";
import { About } from "./components/landing/sections/About";
import { ProblemSolution } from "./components/landing/sections/ProblemSolution";
import { Features } from "./components/landing/sections/Features";
import { HowItWorks } from "./components/landing/sections/HowItWorks";
import { UseCases } from "./components/landing/sections/UseCases";
import { Pricing } from "./components/landing/sections/Pricing";
import { FAQ } from "./components/landing/sections/FAQ";
import { CTABanner } from "./components/landing/sections/CTABanner";
import { Footer } from "./components/landing/sections/Footer";

/* Public marketing/landing page — info-first, login is one click away via
 * the navbar/hero/CTA-banner buttons (all pointing at /login, which owns
 * the actual auth flow; nothing here touches session state). */
export default function LandingPage() {
  return (
    <div className="font-landing-body min-h-screen bg-white text-slate-800 dark:bg-brand-navy dark:text-slate-200">
      <LandingNavbar />
      <main>
        <Hero />
        <StatsBar />
        <About />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <UseCases />
        <Pricing />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}
