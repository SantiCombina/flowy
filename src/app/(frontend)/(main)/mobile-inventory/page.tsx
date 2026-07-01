import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getMobileSellerInventory } from '@/app/services/mobile-seller';
import { PageHeader } from '@/components/layout/page-header';
import { MobileInventorySection } from '@/components/mobile-inventory/mobile-inventory-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Mi inventario',
};

async function MobileInventoryData() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.role !== 'seller') {
    redirect('/dashboard');
  }

  const inventory = await getMobileSellerInventory(user.id);

  return (
    <>
      <RealtimeRefresher channel={`private-seller-${user.id}`} events={['stock_dispatched']} />
      <MobileInventorySection inventory={inventory} />
    </>
  );
}

export default async function MobileInventoryPage() {
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
