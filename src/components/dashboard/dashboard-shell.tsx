'use client';

import { useState } from 'react';

import type { OwnerDashboardStats, Period, SellerDashboardStats } from '@/app/services/dashboard';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';

import { getOwnerDashboardStatsAction, getSellerDashboardStatsAction } from './actions';
import { OwnerDashboard } from './owner-dashboard';
import { SellerDashboard } from './seller-dashboard';

type DashboardShellProps =
  | {
      kind: 'owner';
      userId: number;
      initialStats: OwnerDashboardStats;
      initialPeriod: Period;
    }
  | {
      kind: 'seller';
      userId: number;
      ownerId: number;
      initialStats: SellerDashboardStats;
      initialPeriod: Period;
    };

function OwnerDashboardShell({
  initialStats,
  initialPeriod,
}: {
  initialStats: OwnerDashboardStats;
  initialPeriod: Period;
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const { data, isFetching } = useServerActionQuery({
    queryKey: queryKeys.dashboard.owner(period),
    queryFn: () => getOwnerDashboardStatsAction({ period }),
    initialData: period === initialPeriod ? { success: true, stats: initialStats } : undefined,
    placeholderData: undefined,
    staleTime: 60_000,
  });

  function handlePeriodChange(newPeriod: Period) {
    setPeriod(newPeriod);
    const url = new URL(window.location.href);
    url.searchParams.set('period', newPeriod);
    window.history.pushState(null, '', url.toString());
  }

  const stats = data?.success ? data.stats : initialStats;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <OwnerDashboard stats={stats} period={period} onPeriodChange={handlePeriodChange} isPending={isFetching} />
    </div>
  );
}

function SellerDashboardShell({
  ownerId,
  initialStats,
  initialPeriod,
}: {
  ownerId: number;
  initialStats: SellerDashboardStats;
  initialPeriod: Period;
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod);

  const { data, isFetching } = useServerActionQuery({
    queryKey: queryKeys.dashboard.seller(period),
    queryFn: () => getSellerDashboardStatsAction({ period, ownerId }),
    initialData: period === initialPeriod ? { success: true, stats: initialStats } : undefined,
    placeholderData: undefined,
    staleTime: 30000,
  });

  function handlePeriodChange(newPeriod: Period) {
    setPeriod(newPeriod);
    const url = new URL(window.location.href);
    url.searchParams.set('period', newPeriod);
    window.history.pushState(null, '', url.toString());
  }

  const stats = data?.success ? data.stats : initialStats;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SellerDashboard stats={stats} period={period} onPeriodChange={handlePeriodChange} isPending={isFetching} />
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  if (props.kind === 'owner') {
    return <OwnerDashboardShell initialStats={props.initialStats} initialPeriod={props.initialPeriod} />;
  }

  return (
    <SellerDashboardShell
      ownerId={props.ownerId}
      initialStats={props.initialStats}
      initialPeriod={props.initialPeriod}
    />
  );
}
