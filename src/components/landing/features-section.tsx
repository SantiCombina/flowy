'use client';

import { BarChart3, PackageSearch, ShoppingCart, Users } from 'lucide-react';

import { ScrollReveal } from '@/components/landing/scroll-reveal';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: PackageSearch,
    title: 'Control de stock en tiempo real',
    description: 'Seguí tu inventario al minuto. Alertas automáticas cuando un producto se agota.',
  },
  {
    icon: Users,
    title: 'Vendedores móviles',
    description: 'Asigná stock a tu equipo de ventas y controlá sus movimientos desde cualquier lugar.',
  },
  {
    icon: ShoppingCart,
    title: 'Registro de ventas',
    description: 'Registrá pedidos, pagos parciales y deudas de clientes sin complicaciones.',
  },
  {
    icon: BarChart3,
    title: 'Reportes inteligentes',
    description: 'Visualizá tus ventas, productos más vendidos y deudas en dashboards claros.',
  },
];

const cardStyles = [
  { icon: 'bg-orange-100 text-orange-600', accent: 'bg-orange-500', shadow: 'hover:shadow-orange-500/10' },
  { icon: 'bg-sky-100 text-sky-600', accent: 'bg-sky-500', shadow: 'hover:shadow-sky-500/10' },
  { icon: 'bg-violet-100 text-violet-600', accent: 'bg-violet-500', shadow: 'hover:shadow-violet-500/10' },
  { icon: 'bg-emerald-100 text-emerald-600', accent: 'bg-emerald-500', shadow: 'hover:shadow-emerald-500/10' },
];

export function FeaturesSection() {
  return (
    <section className="relative py-24 sm:py-32 bg-[oklch(0.98_0.005_90)]">
      <div id="features" className="scroll-mt-16" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal>
            <span className="inline-flex items-center rounded-full bg-foreground/5 px-3 py-1 text-sm font-medium text-foreground/60">
              Funciones principales
            </span>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h2
              className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Todo lo que necesitás para controlar tu negocio
            </h2>
          </ScrollReveal>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={0.1 + index * 0.1}>
              <div
                className={cn(
                  'group relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                  cardStyles[index].shadow,
                )}
              >
                <div
                  className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl', cardStyles[index].icon)}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/65">{feature.description}</p>
                <div
                  className={cn(
                    'mt-4 h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-8',
                    cardStyles[index].accent,
                  )}
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
