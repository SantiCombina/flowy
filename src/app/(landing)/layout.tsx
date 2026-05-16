import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { cookies } from 'next/headers';

import '@/app/(landing)/globals.css';

import { FooterSection } from '@/components/landing/footer-section';
import { Navbar } from '@/components/landing/navbar';
import { SchemaOrgScript } from '@/components/landing/schema-org-script';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  preload: true,
});

const schemaOrg = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://flowy.app/#organization',
      name: 'Flowy',
      url: 'https://flowy.app',
      logo: 'https://flowy.app/logo.png',
      description: 'Sistema de gestión de inventario y ventas para distribuidoras.',
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://flowy.app/#website',
      url: 'https://flowy.app',
      name: 'Flowy',
      publisher: { '@id': 'https://flowy.app/#organization' },
      inLanguage: 'es-AR',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://flowy.app/#software',
      name: 'Flowy',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'ARS',
        priceValidUntil: '2027-12-31',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '500',
        bestRating: '5',
        worstRating: '1',
      },
      featureList: [
        'Control de stock en tiempo real',
        'Gestión de vendedores móviles',
        'Registro de ventas y clientes',
        'Reportes inteligentes',
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://flowy.app'),
  title: 'Flowy | Gestión de negocio',
  description:
    'Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas en tiempo real. Flowy es el software diseñado para distribuidoras modernas.',
  keywords: [
    'gestión de inventario',
    'software para distribuidoras',
    'control de stock',
    'ventas',
    'vendedores móviles',
    'SaaS',
    'Flowy',
  ],
  openGraph: {
    title: 'Flowy | Gestión de inventario para distribuidoras',
    description: 'Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas en tiempo real.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Flowy',
    url: 'https://flowy.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flowy | Gestión de inventario para distribuidoras',
    description: 'Controlá tu stock, coordiná tu equipo de vendedores y seguí tus ventas en tiempo real.',
  },
  alternates: {
    canonical: 'https://flowy.app',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function LandingLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get('payload-token')?.value;

  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning>
        <SchemaOrgScript data={schemaOrg} />
        <Navbar isAuthenticated={isAuthenticated} />
        <main>{children}</main>
        <FooterSection />
      </body>
    </html>
  );
}
