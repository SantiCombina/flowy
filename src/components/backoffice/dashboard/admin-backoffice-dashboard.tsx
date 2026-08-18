'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';

import type { BackofficeDashboardStats } from '@/app/services/backoffice/dashboard';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { queryKeys } from '@/lib/query-keys';

import { getBackofficeDashboardStatsAction } from './actions';
import { ActivityFeed } from './activity-feed';
import { MetricCards } from './metric-cards';

const SignupsChart = dynamic(() => import('./signups-chart').then((m) => m.SignupsChart), {
  ssr: false,
  loading: () => <div className="h-55 w-full animate-pulse rounded-xl bg-muted" />,
});

const PLAN_DISTRIBUTION_COLORS: Record<string, string> = {
  basic: '#059669',
  medium: '#2563eb',
  professional: '#7c3aed',
};

const PLAN_DISTRIBUTION_LABELS: Record<string, string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

interface AdminBackofficeDashboardProps {
  userName: string;
  initialStats: BackofficeDashboardStats;
}

export function AdminBackofficeDashboard({ userName, initialStats }: AdminBackofficeDashboardProps) {
  const { invalidateQueries } = useInvalidateQueries();
  const monthLabel = format(new Date(), 'LLLL yyyy', { locale: es });

  const { execute: refetch, isExecuting } = useAction(getBackofficeDashboardStatsAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        invalidateQueries([queryKeys.adminBackoffice.dashboard()]);
      }
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60_000);
    return () => clearInterval(interval);
  }, [refetch]);

  const totalDistribution = initialStats.planDistribution.reduce((sum, entry) => sum + entry.count, 0);
  const distributionSummary = initialStats.planDistribution.map((entry) => ({
    planCode: entry.planCode,
    label: PLAN_DISTRIBUTION_LABELS[entry.planCode] ?? entry.planCode,
    count: entry.count,
    color: PLAN_DISTRIBUTION_COLORS[entry.planCode] ?? '#94a3b8',
    pct: totalDistribution > 0 ? Math.round((entry.count / totalDistribution) * 100) : 0,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={`Buen día, ${userName.split(' ')[0]}!`}
        description={`Resumen de la plataforma · ${monthLabel}`}
      />
      <main
        className={`flex-1 space-y-6 px-4 pb-6 sm:px-6 transition-opacity duration-200 ${isExecuting ? 'opacity-50' : 'opacity-100'}`}
      >
        <MetricCards stats={initialStats} />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nuevos registros · últimos 12 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <SignupsChart data={initialStats.signupsTrend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Distribución por plan</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {totalDistribution === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin suscripciones activas</p>
              ) : (
                <div className="space-y-3">
                  {distributionSummary.map((entry) => (
                    <div key={entry.planCode} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium tabular-nums" style={{ color: entry.color }}>
                            {entry.pct}%
                          </span>
                          <span className="font-semibold tabular-nums">{entry.count}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${entry.pct}%`, backgroundColor: entry.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActivityFeed items={initialStats.activity} />
          </div>
        </div>
      </main>
    </div>
  );
}
