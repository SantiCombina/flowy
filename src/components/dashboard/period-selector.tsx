'use client';

import type { Period } from '@/app/services/dashboard';
import { cn } from '@/lib/utils';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Hoy' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
];

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  disabled?: boolean;
}

export function PeriodSelector({ period, onPeriodChange, disabled }: PeriodSelectorProps) {
  return (
    <div className="flex gap-0.5 rounded-md bg-muted p-0.5 w-fit shadow-sm">
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onPeriodChange(value)}
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium transition-colors disabled:pointer-events-none',
            period === value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
