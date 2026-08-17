import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getAllBudgets } from '@/app/services/budgets';
import { BudgetsSection } from '@/components/budgets/budgets-section';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';

export const metadata: Metadata = {
  title: 'Presupuestos',
};

const moduleAccess = MODULE_ACCESS['/budgets'];

async function BudgetsDataFetcher() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  const isSeller = user.role === 'seller';
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const budgets = await getAllBudgets(user.id);

  return (
    <>
      <RealtimeRefresher channel={channel} events={['budget_created']} />
      <BudgetsSection
        budgets={budgets}
        showSellerColumn={!isSeller}
        isSeller={isSeller}
        capabilities={[...guardedUser.capabilities]}
      />
    </>
  );
}

export default async function BudgetsPage() {
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
        title="Presupuestos"
        description="Cotizaciones y presupuestos para clientes"
        actions={<ColumnVisibilityDropdown tableName="budgets" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={8} />
          </main>
        }
      >
        <BudgetsDataFetcher />
      </Suspense>
    </>
  );
}
