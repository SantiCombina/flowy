'use client';

import { Box, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '#features', label: 'Funciones' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#contacto', label: 'Contacto' },
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

  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-sm' : 'bg-transparent',
      )}
    >
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-900/30">
            <Box className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Flowy
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/dashboard">Ir al dashboard</Link>
            </Button>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                ¿Ya tenés cuenta?{' '}
                <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Accedé
                </Link>
              </span>
              <Button asChild className="rounded-full">
                <a href="#contacto" onClick={(e) => handleAnchorClick(e, '#contacto')}>
                  Solicitá una demo
                </a>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-70 p-0">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border p-4">
                  <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-orange-400 to-orange-600">
                      <Box className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-base font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                      Flowy
                    </span>
                  </Link>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Cerrar menú">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleAnchorClick(e, link.href)}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {link.label}
                    </a>
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
                      <Button className="w-full rounded-full" asChild>
                        <a href="#contacto" onClick={(e) => handleAnchorClick(e, '#contacto')}>
                          Solicitá una demo
                        </a>
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
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
