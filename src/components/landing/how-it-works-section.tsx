import { cn } from '@/lib/utils';

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
    <section id="como-funciona" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-transparent via-muted/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="animate-fade-up text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Empezá en 3 pasos
          </h2>
          <p className="animate-fade-up delay-100 mt-4 text-lg text-muted-foreground">
            De la registración a tu primera venta en minutos, no en días.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={cn(
                'animate-fade-up relative flex flex-col items-center text-center',
                index < steps.length - 1 &&
                  'md:after:absolute md:after:top-12 md:after:right-0 md:after:h-0.5 md:after:w-1/2 md:after:bg-linear-to-r md:after:from-border md:after:to-transparent md:after:content-[""] md:after:translate-x-1/2',
              )}
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              <span
                className="text-6xl font-extrabold text-primary/20 sm:text-7xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {step.number}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
