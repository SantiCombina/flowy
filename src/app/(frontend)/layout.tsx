import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL ?? 'https://flowy.app'),
  title: {
    default: 'Flowy',
    template: '%s | Flowy',
  },
  description: 'Sistema de gestión de inventario y ventas para distribuidoras.',
  appleWebApp: {
    title: 'Flowy',
  },
  openGraph: {
    title: 'Flowy',
    description: 'Sistema de gestión de inventario y ventas para distribuidoras.',
    type: 'website',
    locale: 'es_AR',
    siteName: 'Flowy',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flowy',
    description: 'Sistema de gestión de inventario y ventas para distribuidoras.',
  },
};

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
