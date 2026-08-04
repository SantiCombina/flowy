import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadClients } from '@/app/loaders/clients';
import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { ClientsSection } from '@/components/clients/clients-section';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';
import { serializeForClient } from '@/lib/serialization';

export const metadata: Metadata = {
  title: 'Clientes',
};

const moduleAccess = MODULE_ACCESS['/clients'];

async function ClientsContent() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'owner' && user.role !== 'seller') {
    redirect('/dashboard');
  }

  const { clients, clientDebts } = await loadClients();

  return (
    <ClientsSection
      clients={clients}
      clientDebts={clientDebts}
      currentUser={serializeForClient(user)}
      capabilities={[...guardedUser.capabilities]}
    />
  );
}

export default async function ClientsPage() {
  const guardedUser = await loadActiveGuardedUser();

  if (guardedUser.user.role !== 'owner' && guardedUser.user.role !== 'seller') {
    redirect('/dashboard');
  }

  if (!hasModuleAccess(guardedUser.capabilities, moduleAccess)) {
    return <PlanCapabilityDenied access={moduleAccess} />;
  }

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
