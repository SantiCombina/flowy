import { Quote } from 'lucide-react';

import { cn } from '@/lib/utils';

const stats = [
  { value: '+500', label: 'distribuidoras' },
  { value: '+2M', label: 'productos gestionados' },
  { value: '99.9%', label: 'uptime' },
  { value: '<24h', label: 'tiempo de respuesta' },
];

const testimonials = [
  {
    quote:
      'Antes usábamos planillas de Excel y nunca sabíamos el stock real. Con Flowy tengo visibilidad total de mi negocio en cualquier momento.',
    author: 'Mariana Gutiérrez',
    role: 'Dueña, Distribuidora Norte',
    initials: 'MG',
  },
  {
    quote:
      'Mis vendedores salen con el stock asignado y yo veo en tiempo real qué vendieron. La coordinación mejoró un 300%.',
    author: 'Carlos Benítez',
    role: 'Gerente, Mayorista Sur',
    initials: 'CB',
  },
  {
    quote: 'Implementamos Flowy en un día. La curva de aprendizaje es casi nula y el soporte responde al toque.',
    author: 'Lucía Fernández',
    role: 'COO, Distribuidora Centro',
    initials: 'LF',
  },
];

export function SocialProofSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 gradient-mesh-strong opacity-50" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="animate-fade-up text-center"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="text-4xl font-extrabold text-foreground sm:text-5xl"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-sm font-medium text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, index) => (
            <div
              key={t.author}
              className={cn('animate-fade-up relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm')}
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              <Quote className="h-8 w-8 text-primary/30" aria-hidden="true" />
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{t.quote}</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-orange-100 to-orange-200 text-xs font-bold text-orange-700">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.author}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
