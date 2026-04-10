'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { formatCurrency } from '@/lib/utils';

const formatCurrencyCompact = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
};

const METHODS = [
  { key: 'cash', label: 'Efectivo', color: '#10b981' },
  { key: 'transfer', label: 'Transferencia', color: '#3b82f6' },
  { key: 'check', label: 'Cheque', color: '#8b5cf6' },
] as const;

interface PaymentMethodsChartProps {
  cash: number;
  transfer: number;
  check: number;
}

export function PaymentMethodsChart({ cash, transfer, check }: PaymentMethodsChartProps) {
  const total = cash + transfer + check;

  if (total === 0) {
    return (
      <div className="flex h-55 items-center justify-center">
        <p className="text-sm text-muted-foreground">Sin ventas este período</p>
      </div>
    );
  }

  const values = { cash, transfer, check };
  const data = METHODS.filter(({ key }) => values[key] > 0).map(({ key, label, color }) => ({
    name: label,
    value: values[key],
    color,
    pct: Math.round((values[key] / total) * 100),
  }));

  return (
    <div className="space-y-4">
      <div className="relative [&_svg]:outline-none [&_*:focus]:outline-none">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              dataKey="value"
              strokeWidth={2}
              animationBegin={0}
              animationDuration={600}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="hsl(var(--card))" />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatCurrency(value as number), String(name)]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold leading-tight">{formatCurrencyCompact(total)}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>

      <div className="space-y-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{entry.pct}%</span>
              <span className="font-medium tabular-nums">{formatCurrency(entry.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
