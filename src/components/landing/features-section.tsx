import { BarChart3, PackageSearch, ShoppingCart, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

const features = [
  {
    icon: PackageSearch,
    title: 'Control de stock en tiempo real',
    description: 'Seguí tu inventario al minuto. Alertas automáticas cuando un producto se agota.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Users,
    title: 'Vendedores móviles',
    description: 'Asigná stock a tu equipo de ventas y controlá sus movimientos desde cualquier lugar.',
    color: 'bg-sky-100 text-sky-600',
  },
  {
    icon: ShoppingCart,
    title: 'Registro de ventas',
    description: 'Registrá pedidos, pagos parciales y deudas de clientes sin complicaciones.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Reportes inteligentes',
    description: 'Visualizá tus ventas, productos más vendidos y deudas en dashboards claros.',
    color: 'bg-emerald-100 text-emerald-600',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="animate-fade-up inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            Funciones principales
          </span>
          <h2
            className="animate-fade-up delay-100 mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Todo lo que necesitás para controlar tu negocio
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={cn(
                'animate-fade-up group relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5',
              )}
              style={{ animationDelay: `${(index + 2) * 100}ms` }}
            >
              <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl', feature.color)}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
