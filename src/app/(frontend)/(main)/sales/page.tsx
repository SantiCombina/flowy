import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { loadSales } from '@/app/loaders/sales';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { SalesSection } from '@/components/sales/sales-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { DEFAULT_ITEMS_PER_PAGE } from '@/lib/constants/table-columns';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';
import type { GetSalesListValues } from '@/schemas/sales/sales-list-schema';

export const metadata: Metadata = {
  title: 'Ventas',
};

const moduleAccess = MODULE_ACCESS['/sales'];

async function SalesDataFetcher() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  const isSeller = user.role === 'seller';
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const initialFilters: GetSalesListValues = {
    page: 1,
    limit: DEFAULT_ITEMS_PER_PAGE,
    sort: 'date',
    sortDir: 'desc',
    dateFrom: '',
    dateTo: '',
    paymentStatus: undefined,
    zone: undefined,
    paymentMethod: undefined,
    deliveryStatus: undefined,
  };

  const { zones, result: initialResult } = await loadSales(
    {
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
      paymentStatus: initialFilters.paymentStatus,
      zone: initialFilters.zone,
      paymentMethod: initialFilters.paymentMethod,
      deliveryStatus: initialFilters.deliveryStatus,
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
      <RealtimeRefresher channel={channel} events={['sale_created', 'payment_registered']} />
      <SalesSection
        initialFilters={initialFilters}
        initialResult={initialResult}
        zones={zones}
        showSellerColumn={!isSeller}
        canCollect={guardedUser.capabilities.has('sale.collect')}
        canManage={guardedUser.capabilities.has('sale.create')}
        isSeller={isSeller}
      />
    </>
  );
}

export default async function SalesPage() {
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
        title="Ventas"
        description="Registro y seguimiento de ventas"
        actions={<ColumnVisibilityDropdown tableName="sales" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={9} hasActions />
          </main>
        }
      >
        <SalesDataFetcher />
      </Suspense>
    </>
  );
}
