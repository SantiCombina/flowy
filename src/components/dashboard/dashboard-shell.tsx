'use client';

import { keepPreviousData } from '@tanstack/react-query';
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
      userName: string;
      initialStats: OwnerDashboardStats;
    }
  | {
      kind: 'seller';
      userId: number;
      ownerId: number;
      userName: string;
      initialStats: SellerDashboardStats;
    };

function OwnerDashboardShell({ userName, initialStats }: { userName: string; initialStats: OwnerDashboardStats }) {
  const [period, setPeriod] = useState<Period>('month');

  const { data, isFetching } = useServerActionQuery({
    queryKey: queryKeys.dashboard.owner(period),
    queryFn: () => getOwnerDashboardStatsAction({ period }),
    initialData: { success: true, stats: initialStats },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  function handlePeriodChange(newPeriod: Period) {
    setPeriod(newPeriod);
  }

  const stats = data?.success ? data.stats : initialStats;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <OwnerDashboard
        stats={stats}
        userName={userName}
        period={period}
        onPeriodChange={handlePeriodChange}
        isPending={isFetching}
      />
    </div>
  );
}

function SellerDashboardShell({
  ownerId,
  userName,
  initialStats,
}: {
  ownerId: number;
  userName: string;
  initialStats: SellerDashboardStats;
}) {
  const [period, setPeriod] = useState<Period>('month');

  const { data, isFetching } = useServerActionQuery({
    queryKey: queryKeys.dashboard.seller(period),
    queryFn: () => getSellerDashboardStatsAction({ period, ownerId }),
    initialData: { success: true, stats: initialStats },
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });

  function handlePeriodChange(newPeriod: Period) {
    setPeriod(newPeriod);
  }

  const stats = data?.success ? data.stats : initialStats;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SellerDashboard
        stats={stats}
        userName={userName}
        period={period}
        onPeriodChange={handlePeriodChange}
        isPending={isFetching}
      />
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  if (props.kind === 'owner') {
    return <OwnerDashboardShell userName={props.userName} initialStats={props.initialStats} />;
  }

  return <SellerDashboardShell ownerId={props.ownerId} userName={props.userName} initialStats={props.initialStats} />;
}
