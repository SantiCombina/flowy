import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import type { Period } from '@/app/services/dashboard';
import { Card, CardContent } from '@/components/ui/card';

const PERIOD_COMPARISON_LABEL: Record<Period, string> = {
  day: 'vs ayer',
  week: 'vs semana anterior',
  month: 'vs mes anterior',
  year: 'vs año anterior',
};

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  period?: Period;
  icon: LucideIcon;
  gradient: string;
  delay?: number;
}

export function StatCard({ title, value, subtitle, change, period, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  const comparisonLabel = period ? PERIOD_COMPARISON_LABEL[period] : 'vs período anterior';

  const footer =
    change !== undefined ? (
      <div className="flex items-center gap-1 text-white/70">
        {change >= 0 ? (
          <>
            <TrendingUp className="h-3 w-3 shrink-0" />
            <span>
              +{change}% {comparisonLabel}
            </span>
          </>
        ) : (
          <>
            <TrendingDown className="h-3 w-3 shrink-0" />
            <span>
              {change}% {comparisonLabel}
            </span>
          </>
        )}
      </div>
    ) : subtitle ? (
      <p className="text-white/70">{subtitle}</p>
    ) : null;

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-[both] h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card
        className={`relative h-full overflow-hidden bg-linear-to-br ${gradient} border-0 py-0 text-white shadow-[6px_6px_16px_rgba(0,0,0,0.25),-2px_-2px_8px_rgba(255,255,255,0.08)] hover:shadow-[6px_6px_16px_rgba(0,0,0,0.25),-2px_-2px_8px_rgba(255,255,255,0.08)]`}
        style={{ containerType: 'inline-size' }}
      >
        <Icon className="absolute -right-4 -bottom-3 h-32 w-32 -rotate-12 text-white/10 select-none pointer-events-none" />
        <CardContent className="relative flex h-full flex-col justify-between p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">{title}</p>
            <div className="shrink-0 rounded-full bg-white/20 p-1.5 sm:p-2">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="space-y-1 min-w-0">
            <p
              className="font-display font-black tracking-tight leading-none"
              style={{ fontSize: 'clamp(1.25rem, 8cqi, 1.875rem)' }}
            >
              {value}
            </p>
            <div className="text-[10px] sm:text-xs">{footer}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
