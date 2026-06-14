'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { FlowyLogo } from '@/components/brand/flowy-logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { target: 'features', label: 'Funciones' },
  { target: 'como-funciona', label: 'Cómo funciona' },
  { target: 'contacto', label: 'Contacto' },
];

interface NavbarProps {
  isAuthenticated?: boolean;
}

export function Navbar({ isAuthenticated = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <header
      className={cn(
        'sticky top-0 z-50 transition-colors duration-300',
        scrolled ? 'bg-white/70 backdrop-blur-xl shadow-sm' : 'bg-[oklch(0.13_0.02_260)]',
      )}
    >
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <FlowyLogo iconSize="md" textSize="lg" textClass={scrolled ? undefined : 'text-white'} />

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Button
              key={link.target}
              variant="ghost"
              onClick={() => scrollToSection(link.target)}
              className={cn(
                'text-sm font-medium transition-colors',
                scrolled ? 'text-foreground/70 hover:text-foreground' : 'text-white/70 hover:text-white',
              )}
            >
              {link.label}
            </Button>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard">Ir al dashboard</Link>
            </Button>
          ) : (
            <>
              <span className={cn('text-sm', scrolled ? 'text-foreground/60' : 'text-white/60')}>
                ¿Ya tenés cuenta?{' '}
                <Link
                  href="/login"
                  className={cn(
                    'font-medium underline-offset-4 hover:underline',
                    scrolled ? 'text-foreground' : 'text-white',
                  )}
                >
                  Accedé
                </Link>
              </span>
              <Button
                className="rounded-full"
                variant={scrolled ? 'default' : 'secondary'}
                onClick={() => scrollToSection('contacto')}
              >
                Solicitá una demo
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className={cn('h-5 w-5', scrolled ? 'text-foreground' : 'text-white')} />
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
    </header>
  );
}
