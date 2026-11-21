import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";
import { LANDING_COPY } from "../i18n/landingText";
import { BenefitsSection, AudienceSection } from "../components/landing/BenefitsAndAudienceSections";
import { DashboardPreviewSection } from "../components/landing/DashboardPreviewSection";
import { FinalCtaSection, LandingFooter } from "../components/landing/FinalCtaAndFooter";
import { HeroSection } from "../components/landing/HeroSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { LandingNav } from "../components/landing/LandingNav";
import { FaqSection, ReferralSection } from "../components/landing/ReferralAndFaqSections";
import { SolutionSection } from "../components/landing/SolutionSection";
import { ProblemSection, ValueStrip } from "../components/landing/ValueAndProblemSections";
import { VoiceSection } from "../components/landing/VoiceSection";

const DEFAULT_TITLE = LANDING_COPY.en.meta.title;

export function LandingPage() {
  const { language } = useLanguage();
  const copy = LANDING_COPY[language];

  // Keep the tab title and description in step with the chosen language.
  useEffect(() => {
    document.title = copy.meta.title;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", copy.meta.description);
    return () => {
      document.title = DEFAULT_TITLE;
      description?.setAttribute("content", LANDING_COPY.en.meta.description);
    };
  }, [copy]);

  return (
    <div className="overflow-x-clip bg-slate-50 text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-emerald-800 focus:shadow"
      >
        {copy.nav.skip}
      </a>

      <LandingNav />

      <main id="main">
        <HeroSection />
        <ValueStrip />
        <ProblemSection />
        <SolutionSection />
        <HowItWorksSection />
        <VoiceSection />
        <DashboardPreviewSection />
        <BenefitsSection />
        <AudienceSection />
        <ReferralSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <LandingFooter />
    </div>
  );
}
