'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { FlowyLogo } from '@/components/brand/flowy-logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const navLinks = [
  { target: 'features', label: 'Funciones' },
  { target: 'como-funciona', label: 'Cómo funciona' },
  { target: 'contacto', label: 'Contacto' },
];

interface NavbarProps {
  isAuthenticated?: boolean;
}

export function Navbar({ isAuthenticated = false }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollToSection(targetId: string) {
    const wasMobileOpen = mobileOpen;
    setMobileOpen(false);

    const doScroll = () => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (wasMobileOpen) {
      setTimeout(doScroll, 300);
    } else {
      doScroll();
    }
  }

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed left-1/2 top-3 z-50 mx-auto flex h-14 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 items-center justify-between rounded-2xl border border-white/30 bg-white/70 px-6 shadow-lg backdrop-blur-xl md:w-full"
    >
      <FlowyLogo iconSize="md" textSize="lg" />

      <div className="hidden items-center gap-10 md:flex">
        {navLinks.map((link) => (
          <Button
            key={link.target}
            variant="ghost"
            onClick={() => scrollToSection(link.target)}
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            {link.label}
          </Button>
        ))}
      </div>

      <div className="hidden items-center gap-6 md:flex">
        {isAuthenticated ? (
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        ) : (
          <>
            <span className="text-sm text-foreground/60">
              ¿Ya tenés cuenta?{' '}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Accedé
              </Link>
            </span>
            <Button className="rounded-full" variant="secondary" onClick={() => scrollToSection('contacto')}>
              Solicitá una demo
            </Button>
          </>
        )}
      </div>

      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="h-5 w-5 text-foreground" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-70 p-0">
            <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-border p-4">
                <FlowyLogo iconSize="sm" textSize="md" onClick={() => setMobileOpen(false)} />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                {navLinks.map((link) => (
                  <Button
                    key={link.target}
                    variant="ghost"
                    onClick={() => scrollToSection(link.target)}
                    className="justify-start px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-col gap-3 border-t border-border p-4">
                {isAuthenticated ? (
                  <Button className="w-full rounded-full" variant="outline" asChild>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                      Ir al dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button className="w-full rounded-full" onClick={() => scrollToSection('contacto')}>
                      Solicitá una demo
                    </Button>
                    <p className="text-center text-sm text-foreground/60">
                      ¿Ya tenés cuenta?{' '}
                      <Link
                        href="/login"
                        className="font-medium text-foreground underline-offset-4 hover:underline"
                        onClick={() => setMobileOpen(false)}
                      >
                        Accedé
                      </Link>
                    </p>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
