import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Dashboard',
};

import { getOwnerDashboardStats, getSellerDashboardStats } from '@/app/services/dashboard';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

async function OwnerDashboardData({ userId, userName }: { userId: number; userName: string }) {
  const initialStats = await getOwnerDashboardStats(userId, 'month');
  return <DashboardShell kind="owner" userId={userId} userName={userName} initialStats={initialStats} />;
}

async function SellerDashboardData({
  userId,
  ownerId,
  userName,
}: {
  userId: number;
  ownerId: number;
  userName: string;
}) {
  const initialStats = await getSellerDashboardStats(userId, ownerId, 'month');
  return (
    <DashboardShell kind="seller" userId={userId} ownerId={ownerId} userName={userName} initialStats={initialStats} />
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'owner' || user.role === 'admin') {
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
        <Suspense fallback={<DashboardSkeleton />}>
          <OwnerDashboardData userId={user.id} userName={user.name} />
        </Suspense>
      </>
    );
  }

  const ownerRef = user.owner;
  const ownerId = typeof ownerRef === 'object' && ownerRef !== null ? ownerRef.id : (ownerRef ?? 0);
  return (
    <>
      <RealtimeRefresher channel={`private-seller-${user.id}`} events={['stock_dispatched', 'sale_created']} />
      <Suspense fallback={<DashboardSkeleton />}>
        <SellerDashboardData userId={user.id} ownerId={ownerId} userName={user.name} />
      </Suspense>
    </>
  );
}
