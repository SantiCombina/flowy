'use client';

import { ScrollReveal } from '@/components/landing/scroll-reveal';

const steps = [
  {
    number: '01',
    title: 'Creá tu cuenta',
    description: 'Registrate como dueño, configurá tu negocio y empezá en minutos.',
  },
  {
    number: '02',
    title: 'Cargá tu inventario',
    description: 'Agregá productos, variantes, precios y stock inicial.',
  },
  {
    number: '03',
    title: 'Gestioná tu equipo',
    description: 'Invitá vendedores, asigná stock y seguí las ventas en vivo.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-neutral-50">
      <div id="como-funciona" className="scroll-mt-16" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <h2
              className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Empezá en 3 pasos
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="mt-4 text-lg text-foreground/60">
              De la registración a tu primera venta en minutos, no en días.
            </p>
          </ScrollReveal>
        </div>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute top-12 left-0 hidden h-0.5 w-full md:block">
            <div className="h-full w-full bg-linear-to-r from-foreground/5 via-foreground/15 to-foreground/5" />
          </div>

          {steps.map((step, index) => (
            <ScrollReveal key={step.number} delay={0.1 + index * 0.15}>
              <div className="relative flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/60 bg-card">
                  <span
                    className="text-2xl font-extrabold text-foreground/70"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {step.number}
                  </span>
                </div>
                <h3
                  className="mt-6 text-xl font-semibold text-foreground"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {step.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-foreground/60">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
