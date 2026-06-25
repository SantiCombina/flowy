import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { Button } from '@/components/ui/button';

import { IphoneMockUp } from './cuicui-iphone';
import { MacbookMockUp } from './cuicui-macbook';
import desktopScreen from '/public/screenshots/desktop-screen.png';
import mobileScreen from '/public/screenshots/mobile-screen.png';

export function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden bg-neutral-50">
      <div className="absolute left-1/2 top-28 z-10 -translate-x-1/2 sm:top-32 lg:top-36">
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-50 px-3 py-1.5 text-xs font-medium tracking-wide text-amber-700">
          <span className="size-1.5 rounded-full bg-linear-to-r from-amber-400 to-violet-500" />
          Ideal para distribuidoras
        </span>
      </div>

      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col items-center justify-center px-4 pt-40 pb-16 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        <div className="flex flex-col items-center text-center lg:flex-1 lg:items-start lg:text-left">

          <ScrollReveal delay={0.1}>
            <h1
              className="text-balance text-5xl font-black leading-[1.1] tracking-tighter text-foreground sm:text-6xl lg:text-7xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Gestioná todo tu negocio{' '}
              <span className="bg-linear-to-r from-amber-500 via-orange-500 to-violet-500 bg-clip-text text-transparent">
                sin perder el control
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="mt-5 max-w-lg text-balance text-lg leading-normal text-foreground/60 sm:text-xl">
              Con Flowy, centralizá tu inventario, ventas y equipo en un solo lugar. Olvidate de las planillas de Excel
              y tené visibilidad total de tu negocio.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center lg:w-full">
              <Button
                size="lg"
                className="rounded-full bg-primary px-8 py-6 text-base text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25"
                asChild
              >
                <a href="#contacto">Solicitá una demo</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-border/60 bg-transparent px-8 py-6 text-base text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                asChild
              >
                <a href="#features">Conocé las funciones</a>
              </Button>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.4} direction="right" className="mt-16 lg:mt-0 lg:shrink-0">
          <div className="group pointer-events-none relative flex justify-center">
            <div className="pointer-events-auto relative rotate-[-1.5deg] drop-shadow-[0_15px_40px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.02] group-hover:drop-shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
              <MacbookMockUp src={desktopScreen} alt="Flowy dashboard en notebook" />
            </div>

            <div className="pointer-events-auto absolute right-2 -bottom-4 z-30 rotate-[5deg] scale-[0.35] origin-bottom-right drop-shadow-[0_12px_35px_rgba(0,0,0,0.08)] transition-all duration-500 ease-out group-hover:-translate-y-4 group-hover:translate-x-1 group-hover:rotate-[8deg] group-hover:drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] sm:scale-[0.45] lg:-right-4 lg:-bottom-12 lg:scale-[0.45]">
              <IphoneMockUp src={mobileScreen} alt="Flowy en tu celular" />
            </div>

            <div className="absolute -bottom-8 left-1/2 z-0 h-32 w-3/4 -translate-x-1/2 rounded-full bg-linear-to-r from-transparent via-primary/10 to-transparent blur-2xl opacity-60 transition-all duration-500 group-hover:opacity-80 group-hover:scale-110" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
