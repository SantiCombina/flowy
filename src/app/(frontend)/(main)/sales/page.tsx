import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSales } from '@/app/services/sales';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { SalesSection } from '@/components/sales/sales-section';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Ventas',
};

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const initialStatusFilter =
    params.status === 'pending' ? 'pending' : params.status === 'collected' ? 'collected' : undefined;

  if (user.role === 'seller') {
    const sales = await getSales({ sellerId: user.id });
    return (
      <>
        <RealtimeRefresher channel={`private-seller-${user.id}`} events={['sale_created', 'payment_registered']} />
        <SalesSection
          key={initialStatusFilter ?? 'all'}
          sales={sales}
          showSellerColumn={false}
          canCollect={true}
          isSeller={true}
          initialStatusFilter={initialStatusFilter}
        />
      </>
    );
  }

  if (user.role === 'owner') {
    const sales = await getSales({ ownerId: user.id });
    return (
      <>
        <RealtimeRefresher channel={`private-owner-${user.id}`} events={['sale_created', 'payment_registered']} />
        <SalesSection
          key={initialStatusFilter ?? 'all'}
          sales={sales}
          showSellerColumn={true}
          canCollect={true}
          isSeller={false}
          initialStatusFilter={initialStatusFilter}
        />
      </>
    );
  }

  redirect('/');
}
