import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  gradient: string;
  delay?: number;
}

export function StatCard({ title, value, subtitle, change, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-[both] h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card
        className={`relative h-full overflow-hidden bg-linear-to-br ${gradient} border-0 text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl`}
      >
        <Icon className="absolute -right-4 -bottom-3 h-28 w-28 -rotate-12 text-white/10 select-none pointer-events-none" />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-medium text-white/80">{title}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {subtitle && <p className="text-xs text-white/70">{subtitle}</p>}
            </div>
            <div className="shrink-0 rounded-full bg-white/20 p-2">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          {change !== undefined && (
            <div className="mt-3 flex items-center gap-1 text-xs text-white/90">
              {change >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3" />
                  <span>+{change}% vs mes anterior</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3" />
                  <span>{change}% vs mes anterior</span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
