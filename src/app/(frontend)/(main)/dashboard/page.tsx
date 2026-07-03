import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Dashboard',
};

import { getOwnerDashboardStats, getSellerDashboardStats } from '@/app/services/dashboard';
import type { Period } from '@/app/services/dashboard';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

const VALID_PERIODS: Period[] = ['day', 'week', 'month', 'year'];

function resolvePeriod(raw: string | undefined): Period {
  return VALID_PERIODS.includes(raw as Period) ? (raw as Period) : 'month';
}

async function DashboardContent({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const params = await searchParams;
  const initialPeriod = resolvePeriod(params.period);

  const user = await getCurrentUser();
  if (!user) redirect('/login');

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
        <DashboardShell
          kind="owner"
          userId={user.id}
          userName={user.name}
          initialStats={await getOwnerDashboardStats(user.id, initialPeriod)}
          initialPeriod={initialPeriod}
        />
      </>
    );
  }

  const ownerRef = user.owner;
  const ownerId = typeof ownerRef === 'object' && ownerRef !== null ? ownerRef.id : (ownerRef ?? 0);
  return (
    <>
      <RealtimeRefresher channel={`private-seller-${user.id}`} events={['stock_dispatched', 'sale_created']} />
      <DashboardShell
        kind="seller"
        userId={user.id}
        ownerId={ownerId}
        userName={user.name}
        initialStats={await getSellerDashboardStats(user.id, ownerId, initialPeriod)}
        initialPeriod={initialPeriod}
      />
    </>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  return (
    <>
      <PageHeader title="Dashboard" description="Resumen general del negocio" />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
