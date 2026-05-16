import { Box } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const quickLinks = [
  { label: 'Funciones', href: '#features' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Contacto', href: '#contacto' },
];

const legalLinks = [
  { label: 'Términos de servicio', href: '#' },
  { label: 'Privacidad', href: '#' },
];

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-900/30">
                <Box className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                Flowy
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-background/60">
              Sistema de gestión de inventario y ventas diseñado para distribuidoras modernas.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-background/80">Links</h4>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-background/60 transition-colors hover:text-background">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-background/80">Legal</h4>
            <ul className="mt-4 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-background/60 transition-colors hover:text-background">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 sm:flex-row">
          <p className="text-xs text-background/50">© 2026 Flowy</p>
          <a href="https://forge.ar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
            <span className="text-xs text-background/50">Un desarrollo de</span>
            <Image src="/Forge.png" alt="Forge" width={56} height={16} className="h-6 w-auto opacity-60" />
          </a>
        </div>
      </div>
    </footer>
  );
}
