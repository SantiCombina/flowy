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
    <footer className="bg-[oklch(0.13_0.02_260)] border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <FlowyLogo iconSize="md" textSize="md" textClass="text-white" />
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Sistema de gestión de inventario y ventas diseñado para distribuidoras modernas.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/70">Links</h4>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Button
                    variant="link"
                    onClick={() => scrollToSection(link.target)}
                    className="h-auto p-0 text-sm text-white/60 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white/70">Legal</h4>
            <ul className="mt-4 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/60 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/60">© 2026 Flowy</p>
          <a
            href="https://forge.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5"
          >
            <span className="text-xs text-white/60">Un desarrollo de</span>
            <Image
              src="/forge.png"
              alt="Forge"
              width={56}
              height={16}
              className="h-6 w-auto opacity-60 transition-opacity group-hover:opacity-80"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
