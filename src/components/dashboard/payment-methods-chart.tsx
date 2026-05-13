'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { formatCurrency } from '@/lib/utils';

const formatCurrencyCompact = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
};

const METHODS = [
  { key: 'cash', label: 'Efectivo', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  { key: 'transfer', label: 'Transferencia', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { key: 'check', label: 'Cheque', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
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
  const data = METHODS.filter(({ key }) => values[key] > 0).map(({ key, label, color, bg }) => {
    const rawPct = (values[key] / total) * 100;
    const pct = Math.round(rawPct);
    return {
      name: label,
      value: values[key],
      color,
      bg,
      pct,
      pctLabel: pct === 0 ? '<1%' : `${pct}%`,
      barWidth: pct === 0 ? 1 : pct,
    };
  });

  return (
    <div className="space-y-4">
      <div className="relative [&_svg]:outline-none [&_*:focus]:outline-none" style={{ overflow: 'visible' }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={84}
              dataKey="value"
              strokeWidth={3}
              paddingAngle={4}
              cornerRadius={16}
              animationBegin={0}
              animationDuration={600}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="hsl(var(--card))" />
              ))}
            </Pie>
            <Tooltip
              content={<CustomTooltip formatter={(value, name) => [formatCurrency(value as number), String(name)]} />}
              wrapperStyle={{ outline: 'none', zIndex: 9999 }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-lg font-black tracking-tight">{formatCurrencyCompact(total)}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">total</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.map((entry) => (
          <div key={entry.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium tabular-nums" style={{ color: entry.color }}>
                  {entry.pctLabel}
                </span>
                <span className="font-semibold tabular-nums">{formatCurrency(entry.value)}</span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: entry.bg }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${entry.barWidth}%`, backgroundColor: entry.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  formatter?: (value: number, name: string) => [string, string];
}

function CustomTooltip({ active, payload, formatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  const [formattedValue, name] = formatter
    ? formatter(item.value as number, item.name)
    : [String(item.value), item.name];
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-gray-900">{formattedValue}</p>
      {name && <p className="text-gray-500 mt-0.5">{name}</p>}
    </div>
  );
}
