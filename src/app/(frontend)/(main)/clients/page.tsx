import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getClientDebts, getClients } from '@/app/services/clients';
import { ClientsSection } from '@/components/clients/clients-section';
import { PageHeader } from '@/components/layout/page-header';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { getCurrentUser } from '@/lib/payload';
import { serializeForClient } from '@/lib/serialization';

export const metadata: Metadata = {
  title: 'Clientes',
};

async function ClientsContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let ownerId: number;
  let sellerId: number | undefined;

  if (user.role === 'owner') {
    ownerId = user.id;
  } else if (user.role === 'seller') {
    ownerId = typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0);
    sellerId = user.id;
  } else {
    redirect('/dashboard');
  }

  const [clients, clientDebts] = await Promise.all([
    getClients({ ownerId, sellerId }),
    getClientDebts({ ownerId, sellerId }),
  ]);

  return <ClientsSection clients={clients} clientDebts={clientDebts} currentUser={serializeForClient(user)} />;
}

export default async function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gestión de clientes del negocio"
        actions={<ColumnVisibilityDropdown tableName="clients" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={6} rows={8} hasActions />
          </main>
        }
      >
        <ClientsContent />
      </Suspense>
    </>
  );
}
