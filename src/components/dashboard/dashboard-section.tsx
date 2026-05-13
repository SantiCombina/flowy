import { PageHeader } from '@/components/layout/page-header';

export function DashboardSection() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Dashboard" description="Resumen general del negocio" />

      <main className="flex-1 px-4 pb-6 sm:px-6">
        <div className="flex items-center justify-center rounded-lg bg-muted/40 p-12 shadow-sm">
          <p className="text-muted-foreground">Contenido del dashboard próximamente...</p>
        </div>
      </main>
    </div>
  );
}
