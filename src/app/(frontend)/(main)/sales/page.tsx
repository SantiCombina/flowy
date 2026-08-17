import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getAllSales } from '@/app/services/sales';
import { getZones } from '@/app/services/zones';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { SalesSection } from '@/components/sales/sales-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';

export const metadata: Metadata = {
  title: 'Ventas',
};

const moduleAccess = MODULE_ACCESS['/sales'];

async function SalesDataFetcher() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  const isSeller = user.role === 'seller';
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const scope = isSeller ? { sellerId: user.id } : { ownerId: user.id };
  const [zones, sales] = await Promise.all([getZones(user.id), getAllSales(scope)]);

  return (
    <>
      <RealtimeRefresher channel={channel} events={['sale_created', 'payment_registered']} />
      <SalesSection
        sales={sales}
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
