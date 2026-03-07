'use client';

import Link from 'next/link';

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
}

export function PeriodSelector({ period }: PeriodSelectorProps) {
  return (
    <div className="flex gap-0.5 rounded-md border bg-muted p-0.5 w-fit">
      {PERIODS.map(({ value, label }) => (
        <Link
          key={value}
          href={`?period=${value}`}
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
            period === value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
