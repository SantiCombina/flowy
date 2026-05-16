import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-lg" aria-hidden="true">
      <div className="animate-float relative rounded-2xl border border-border/60 bg-white/80 p-4 shadow-2xl shadow-black/5 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400/80" />
          <div className="h-3 w-3 rounded-full bg-amber-400/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          <div className="ml-auto h-2 w-24 rounded-full bg-muted" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-linear-to-br from-orange-50 to-orange-100/50 p-3">
            <div className="mb-2 h-2 w-10 rounded-full bg-orange-200" />
            <div className="h-6 w-16 rounded-lg bg-orange-300/60" />
          </div>
          <div className="rounded-xl bg-linear-to-br from-sky-50 to-sky-100/50 p-3">
            <div className="mb-2 h-2 w-10 rounded-full bg-sky-200" />
            <div className="h-6 w-16 rounded-lg bg-sky-300/60" />
          </div>
          <div className="rounded-xl bg-linear-to-br from-violet-50 to-violet-100/50 p-3">
            <div className="mb-2 h-2 w-10 rounded-full bg-violet-200" />
            <div className="h-6 w-16 rounded-lg bg-violet-300/60" />
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-muted/40 p-3">
          <div className="mb-3 flex items-end gap-2">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="w-full rounded-t-md bg-linear-to-t from-primary/80 to-primary/40"
                style={{ height: `${h * 0.6}px` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
              <span key={d} className="text-[10px] text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
            <div className="h-6 w-6 rounded-md bg-primary/20" />
            <div className="flex-1 space-y-1">
              <div className="h-2 w-24 rounded-full bg-muted-foreground/20" />
              <div className="h-1.5 w-16 rounded-full bg-muted-foreground/10" />
            </div>
            <div className="h-4 w-10 rounded-md bg-emerald-100" />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-2">
            <div className="h-6 w-6 rounded-md bg-sky/20" />
            <div className="flex-1 space-y-1">
              <div className="h-2 w-20 rounded-full bg-muted-foreground/20" />
              <div className="h-1.5 w-14 rounded-full bg-muted-foreground/10" />
            </div>
            <div className="h-4 w-10 rounded-md bg-emerald-100" />
          </div>
        </div>
      </div>

      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-linear-to-br from-primary/20 to-violet/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-linear-to-br from-sky/20 to-primary/10 blur-2xl" />
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden gradient-mesh">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-7xl flex-col items-center justify-center px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:py-24">
        <div className="flex max-w-2xl flex-col items-center text-center lg:items-start lg:text-left">
          <h1
            className={cn(
              'animate-fade-up text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl',
            )}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Gestioná tu distribuidora <span className="text-gradient">sin perder el control</span>
          </h1>

          <p className="animate-fade-up delay-200 mt-6 text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Flowy es el sistema de inventario y ventas diseñado para dueños de distribuidoras que quieren saber
            exactamente qué pasa en su negocio.
          </p>

          <div className="animate-fade-up delay-300 mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-base shadow-lg shadow-primary/25 transition-shadow hover:shadow-xl hover:shadow-primary/30"
              asChild
            >
              <a href="#contacto">Solicitá una demo</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-base" asChild>
              <a href="#features">Conocé las funciones</a>
            </Button>
          </div>
        </div>

        <div className="animate-fade-up delay-400 mt-12 flex w-full justify-center lg:mt-0 lg:w-auto">
          <DashboardMockup />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-sky/5 blur-3xl" />
      </div>
    </section>
  );
}
