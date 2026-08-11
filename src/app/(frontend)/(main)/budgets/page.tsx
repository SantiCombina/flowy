import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadBudgets } from '@/app/loaders/budgets';
import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { BudgetsSection } from '@/components/budgets/budgets-section';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { DEFAULT_ITEMS_PER_PAGE } from '@/lib/constants/table-columns';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';
import type { GetBudgetsListValues } from '@/schemas/budgets/budget-list-schema';

export const metadata: Metadata = {
  title: 'Presupuestos',
};

const moduleAccess = MODULE_ACCESS['/budgets'];

async function BudgetsDataFetcher() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  const isSeller = user.role === 'seller';
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const initialFilters: GetBudgetsListValues = {
    page: 1,
    limit: DEFAULT_ITEMS_PER_PAGE,
    sort: 'date',
    sortDir: 'desc',
    dateFrom: undefined,
    dateTo: undefined,
    status: undefined,
  };

  const initialResult = await loadBudgets(
    {
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
      status: initialFilters.status,
    },
    {
      page: initialFilters.page,
      limit: initialFilters.limit,
      sort: initialFilters.sort,
      sortDir: initialFilters.sortDir,
    },
  );

  return (
    <>
      <RealtimeRefresher channel={channel} events={['budget_created']} />
      <BudgetsSection
        initialFilters={initialFilters}
        initialResult={initialResult}
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
