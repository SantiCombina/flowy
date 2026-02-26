import { PageHeader } from '@/components/layout/page-header';

export function ClientsSection() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Clientes" description="Gestión de clientes del negocio" />

      <main className="flex-1 px-4 pb-6 sm:px-6">
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">Contenido de clientes próximamente...</p>
        </div>
      </main>
    </div>
  );
}
