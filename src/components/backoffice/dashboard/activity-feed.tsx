import { Bell, UserPlus } from 'lucide-react';

import type { DashboardActivityItem } from '@/app/services/backoffice/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

const RELATIVE_THRESHOLDS = [
  { seconds: 60, divisor: 1, unit: 'segundo' as const },
  { seconds: 3600, divisor: 60, unit: 'minuto' as const },
  { seconds: 86400, divisor: 3600, unit: 'hora' as const },
  { seconds: 604800, divisor: 86400, unit: 'día' as const, useDays: true },
  { seconds: 2592000, divisor: 604800, unit: 'semana' as const, useWeeks: true },
  { seconds: 31536000, divisor: 2592000, unit: 'mes' as const, useMonths: true },
];

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return 'hace unos segundos';

  for (const threshold of RELATIVE_THRESHOLDS) {
    if (seconds < threshold.seconds) {
      const value = Math.floor(seconds / threshold.divisor);
      const plural = value === 1 ? '' : 's';
      if (threshold.useDays) return `hace ${value} ${threshold.unit}${plural}`;
      if (threshold.useWeeks) return `hace ${value} ${threshold.unit}${plural}`;
      if (threshold.useMonths) return `hace ${value} ${threshold.unit}${plural}`;
      return `hace ${value} ${threshold.unit}${plural}`;
    }
  }

  const years = Math.floor(seconds / 31536000);
  return `hace ${years} año${years === 1 ? '' : 's'}`;
}

interface ActivityFeedProps {
  items: DashboardActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Actividad reciente</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="Sin actividad reciente" />
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = item.kind === 'signup' ? UserPlus : Bell;
              return (
                <div key={item.id} className="flex items-start gap-3 rounded-md bg-muted/40 px-3 py-2.5 text-sm">
                  <div className="mt-0.5 shrink-0 rounded-full bg-primary/10 p-1.5 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.body}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelativeTime(item.occurredAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
