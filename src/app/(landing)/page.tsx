import type { Metadata } from 'next';

import { CtaSection } from '@/components/landing/cta-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { SocialProofSection } from '@/components/landing/social-proof-section';

export const metadata: Metadata = {
  description:
    'Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas en tiempo real. Flowy es el software diseñado para distribuidoras modernas.',
};

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CtaSection />
    </>
  );
}
