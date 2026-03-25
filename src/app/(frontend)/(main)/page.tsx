import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard',
};

import { getOwnerDashboardStats, getSellerDashboardStats } from '@/app/services/dashboard';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'owner' || user.role === 'admin') {
    const initialStats = await getOwnerDashboardStats(user.id, 'month');
    return (
      <>
        <RealtimeRefresher
          channel={`private-owner-${user.id}`}
          events={[
            'sale_created',
            'payment_registered',
            'stock_dispatched',
            'stock_returned',
            'stock_low',
            'stock_adjusted',
          ]}
        />
        <DashboardShell kind="owner" userId={user.id} userName={user.name} initialStats={initialStats} />
      </>
    );
  }

  const ownerRef = user.owner;
  const ownerId = typeof ownerRef === 'object' && ownerRef !== null ? ownerRef.id : (ownerRef ?? 0);
  const initialStats = await getSellerDashboardStats(user.id, ownerId, 'month');
  return (
    <>
      <RealtimeRefresher channel={`private-seller-${user.id}`} events={['stock_dispatched', 'sale_created']} />
      <DashboardShell
        kind="seller"
        userId={user.id}
        ownerId={ownerId}
        userName={user.name}
        initialStats={initialStats}
      />
    </>
  );
}
