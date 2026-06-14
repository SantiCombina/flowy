import { IphoneMockUp } from '@/components/landing/cuicui-iphone';
import { MacbookMockUp } from '@/components/landing/cuicui-macbook';
import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { Button } from '@/components/ui/button';
import desktopScreen from '/public/screenshots/desktop-screen.png';
import mobileScreen from '/public/screenshots/mobile-screen.png';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[oklch(0.13_0.02_260)]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        <div className="flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left lg:basis-[55%]">
          <ScrollReveal>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white/60">
              Para distribuidoras modernas
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1
              className="mt-4 text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Gestioná tu distribuidora{' '}
              <span className="bg-linear-to-r from-amber-400 via-orange-400 to-violet-400 bg-clip-text text-transparent">
                sin perder el control
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="mt-6 text-balance text-lg leading-relaxed text-white/60 sm:text-xl">
              Flowy es el sistema de inventario y ventas diseñado para dueños de distribuidoras que quieren saber
              exactamente qué pasa en su negocio.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="rounded-full bg-white px-8 py-6 text-base text-foreground shadow-lg shadow-white/10 transition-all hover:bg-white/90 hover:shadow-xl hover:shadow-white/20"
                asChild
              >
                <a href="#contacto">Solicitá una demo</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-8 py-6 text-base text-white hover:bg-white/15 hover:text-white"
                asChild
              >
                <a href="#features">Conocé las funciones</a>
              </Button>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.4} direction="right" className="mt-16 lg:mt-0 lg:basis-[45%]">
          <div className="group pointer-events-none relative flex justify-center">
            <div className="pointer-events-auto relative rotate-[-1.5deg] drop-shadow-[0_15px_40px_rgba(255,255,255,0.15)] transition-all duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.02] group-hover:drop-shadow-[0_20px_50px_rgba(255,255,255,0.18)]">
              <MacbookMockUp src={desktopScreen} alt="Flowy dashboard en notebook" />
            </div>

            <div className="pointer-events-auto absolute right-2 -bottom-4 z-30 rotate-[5deg] scale-[0.35] origin-bottom-right drop-shadow-[0_12px_35px_rgba(255,255,255,0.15)] transition-all duration-500 ease-out group-hover:-translate-y-4 group-hover:translate-x-1 group-hover:rotate-[8deg] group-hover:drop-shadow-[0_18px_40px_rgba(255,255,255,0.18)] sm:scale-[0.45] lg:-right-4 lg:-bottom-12 lg:scale-[0.45]">
              <IphoneMockUp src={mobileScreen} alt="Flowy en tu celular" />
            </div>

            <div className="absolute -bottom-8 left-1/2 z-0 h-32 w-3/4 -translate-x-1/2 rounded-full bg-linear-to-r from-transparent via-white/20 to-transparent blur-2xl opacity-80 transition-all duration-500 group-hover:opacity-100 group-hover:scale-110" />
          </div>
        </ScrollReveal>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 -left-20 h-125 w-125 rounded-full bg-[oklch(0.5_0.15_260/0.08)] blur-3xl" />
        <div className="absolute -bottom-20 right-0 h-150 w-150 rounded-full bg-[oklch(0.45_0.12_280/0.1)] blur-3xl" />
        <div className="absolute top-1/2 left-1/3 h-75 w-75 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.55_0.1_240/0.06)] blur-3xl" />
      </div>
    </section>
  );
}
