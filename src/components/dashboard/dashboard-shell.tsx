'use client';

import { useAction } from 'next-safe-action/hooks';
import { useState, useTransition } from 'react';

import type { OwnerDashboardStats, Period, SellerDashboardStats } from '@/app/services/dashboard';

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

function OwnerDashboardShell({
  userName,
  initialStats,
}: {
  userName: string;
  initialStats: OwnerDashboardStats;
}) {
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<OwnerDashboardStats>(initialStats);
  const [isPending, startTransition] = useTransition();
  const { executeAsync } = useAction(getOwnerDashboardStatsAction);

  function handlePeriodChange(newPeriod: Period) {
    startTransition(async () => {
      const result = await executeAsync({ period: newPeriod });
      if (result?.data?.success) {
        setStats(result.data.stats);
      }
      setPeriod(newPeriod);
    });
  }

  return (
    <OwnerDashboard
      stats={stats}
      userName={userName}
      period={period}
      onPeriodChange={handlePeriodChange}
      isPending={isPending}
    />
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
  const [stats, setStats] = useState<SellerDashboardStats>(initialStats);
  const [isPending, startTransition] = useTransition();
  const { executeAsync } = useAction(getSellerDashboardStatsAction);

  function handlePeriodChange(newPeriod: Period) {
    startTransition(async () => {
      const result = await executeAsync({ period: newPeriod, ownerId });
      if (result?.data?.success) {
        setStats(result.data.stats);
      }
      setPeriod(newPeriod);
    });
  }

  return (
    <SellerDashboard
      stats={stats}
      userName={userName}
      period={period}
      onPeriodChange={handlePeriodChange}
      isPending={isPending}
    />
  );
}

export function DashboardShell(props: DashboardShellProps) {
  if (props.kind === 'owner') {
    return (
      <OwnerDashboardShell
        userName={props.userName}
        initialStats={props.initialStats}
      />
    );
  }

  return (
    <SellerDashboardShell
      ownerId={props.ownerId}
      userName={props.userName}
      initialStats={props.initialStats}
    />
  );
}
