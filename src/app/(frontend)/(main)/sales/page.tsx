import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getSales } from '@/app/services/sales';
import { getZones } from '@/app/services/zones';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { SalesSection } from '@/components/sales/sales-section';
import { getCurrentUser } from '@/lib/payload';

import SalesLoading from './loading';

export const metadata: Metadata = {
  title: 'Ventas',
};

async function SalesData({
  userId,
  isSeller,
  initialStatusFilter,
  ownerId,
}: {
  userId: number;
  isSeller: boolean;
  initialStatusFilter?: 'pending' | 'collected';
  ownerId: number;
}) {
  const [sales, zones] = await Promise.all([
    getSales(isSeller ? { sellerId: userId } : { ownerId: userId }),
    getZones(ownerId),
  ]);

  return (
    <SalesSection
      initialSales={{ success: true, sales }}
      zones={zones}
      showSellerColumn={!isSeller}
      canCollect={true}
      canManage={true}
      isSeller={isSeller}
      initialStatusFilter={initialStatusFilter}
    />
  );
}

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'seller' && user.role !== 'owner') redirect('/');

  const params = await searchParams;
  const initialStatusFilter =
    params.status === 'pending' ? 'pending' : params.status === 'collected' ? 'collected' : undefined;

  const isSeller = user.role === 'seller';
  const ownerId = isSeller ? (typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0)) : user.id;
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  return (
    <>
      <RealtimeRefresher channel={channel} events={['sale_created', 'payment_registered']} />
      <Suspense key={initialStatusFilter ?? 'all'} fallback={<SalesLoading />}>
        <SalesData userId={user.id} isSeller={isSeller} initialStatusFilter={initialStatusFilter} ownerId={ownerId} />
      </Suspense>
    </>
  );
}
