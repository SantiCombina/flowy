import { DollarSign, PieChart, UserPlus, Users } from 'lucide-react';

import type { BackofficeDashboardStats } from '@/app/services/backoffice/dashboard';
import { StatCard } from '@/components/dashboard/stat-card';
import { formatUsdMonthlyPrice } from '@/lib/money';

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

interface MetricCardsProps {
  stats: BackofficeDashboardStats;
}

export function MetricCards({ stats }: MetricCardsProps) {
  const distributionSummary = stats.planDistribution
    .filter((entry) => entry.count > 0)
    .map((entry) => `${PLAN_LABELS[entry.planCode] ?? entry.planCode}: ${entry.count}`)
    .join(' · ');

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 xl:grid-cols-4">
      <StatCard
        title="MRR estimado"
        value={formatUsdMonthlyPrice(stats.mrr)}
        subtitle="Suscripciones activas"
        icon={DollarSign}
        gradient="from-emerald-500 to-teal-600"
        delay={0}
      />
      <StatCard
        title="Suscripciones activas"
        value={String(stats.activeSubscribers)}
        subtitle="Tenants con pago"
        icon={Users}
        gradient="from-blue-500 to-indigo-600"
        delay={75}
      />
      <StatCard
        title="Nuevos este mes"
        value={String(stats.newSignupsThisMonth)}
        subtitle="Tenants registrados"
        icon={UserPlus}
        gradient="from-rose-500 to-pink-600"
        delay={150}
      />
      <StatCard
        title="Distribución"
        value={String(stats.activeSubscribers)}
        subtitle={distributionSummary || 'Sin suscripciones activas'}
        icon={PieChart}
        gradient="from-amber-500 to-orange-600"
        delay={225}
      />
    </div>
  );
}
