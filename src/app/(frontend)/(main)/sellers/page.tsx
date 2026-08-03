import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { loadSellers } from '@/app/loaders/sellers';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { SellersSection } from '@/components/sellers/sellers-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';

export const metadata: Metadata = {
  title: 'Vendedores',
};

const moduleAccess = MODULE_ACCESS['/sellers'];

async function SellersData() {
  const guardedUser = await loadActiveGuardedUser();

  const { sellers, variants, commissionSummaries } = await loadSellers();

  return (
    <SellersSection
      initialSellers={{ success: true, sellers }}
      variants={variants}
      commissionBalances={commissionSummaries}
      capabilities={[...guardedUser.capabilities]}
    />
  );
}

export default async function SellersPage() {
  const guardedUser = await loadActiveGuardedUser();

  if (guardedUser.user.role !== 'owner') {
    redirect('/dashboard');
  }

  if (!hasModuleAccess(guardedUser.capabilities, moduleAccess)) {
    return <PlanCapabilityDenied access={moduleAccess} />;
  }

  return (
    <>
      <PageHeader
        title="Vendedores"
        description="Gestión del equipo de ventas"
        actions={<ColumnVisibilityDropdown tableName="sellers" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={7} rows={6} hasActions firstColumnVariant="status-dot" />
          </main>
        }
      >
        <SellersData />
      </Suspense>
    </>
  );
}
