import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ContactSection } from '@/components/landing/contact-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { HeroSection } from '@/components/landing/hero-section';
import { HowItWorksSection } from '@/components/landing/how-it-works-section';
import { SocialProofSection } from '@/components/landing/social-proof-section';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  description:
    'Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas en tiempo real. Flowy es el software diseñado para distribuidoras modernas.',
};

export default async function LandingPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <SocialProofSection />
      <ContactSection />
    </>
  );
}
