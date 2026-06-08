'use client';

import Image from 'next/image';
import Link from 'next/link';

import { FlowyLogo } from '@/components/brand/flowy-logo';
import { Button } from '@/components/ui/button';

const quickLinks = [
  { label: 'Funciones', target: 'features' },
  { label: 'Cómo funciona', target: 'como-funciona' },
  { label: 'Contacto', target: 'contacto' },
];

const legalLinks = [
  { label: 'Términos de servicio', href: '#' },
  { label: 'Privacidad', href: '#' },
];

function scrollToSection(targetId: string) {
  const element = document.getElementById(targetId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
}

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <FlowyLogo iconSize="md" textSize="md" />
            <p className="max-w-xs text-sm leading-relaxed text-background/60">
              Sistema de gestión de inventario y ventas diseñado para distribuidoras modernas.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-background/80">Links</h4>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Button
                    variant="link"
                    onClick={() => scrollToSection(link.target)}
                    className="h-auto p-0 text-sm text-background/60 transition-colors hover:text-background"
                  >
                    {link.label}
                  </Button>
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
            <Image src="/forge.png" alt="Forge" width={56} height={16} className="h-6 w-auto opacity-60" />
          </a>
        </div>
      </div>
    </footer>
  );
}
