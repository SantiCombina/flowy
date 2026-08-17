import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getMobileSellerInventory } from '@/app/services/mobile-seller';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { MobileInventorySection } from '@/components/mobile-inventory/mobile-inventory-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';

export const metadata: Metadata = {
  title: 'Mi inventario',
};

const moduleAccess = MODULE_ACCESS['/mobile-inventory'];

async function MobileInventoryData() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'seller') {
    redirect('/dashboard');
  }

  if (!hasModuleAccess(guardedUser.capabilities, moduleAccess)) {
    return <PlanCapabilityDenied access={moduleAccess} />;
  }

  const inventory = await getMobileSellerInventory(user.id);

  return (
    <>
      <RealtimeRefresher channel={`private-seller-${user.id}`} events={['stock_dispatched']} />
      <MobileInventorySection inventory={inventory} />
    </>
  );
}

export default function MobileInventoryPage() {
  return (
    <>
      <PageHeader title="Mi Inventario" description="Stock que llevás en tu vehículo" />
      <Suspense
        fallback={
          <div className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <div className="h-6 w-32 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-36 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        }
      >
        <MobileInventoryData />
      </Suspense>
    </>
  );
}
