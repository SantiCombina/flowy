'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { DayData, Period } from '@/app/services/dashboard';
import { formatCurrency } from '@/lib/utils';

const formatCurrencyShort = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
};

function formatXAxisTick(value: string, period: Period): string {
  if (period === 'year') {
    return new Date(value + '-02').toLocaleDateString('es-AR', { month: 'short' });
  }
  const parts = value.split('-');
  return `${parseInt(parts[2] ?? '0')}/${parseInt(parts[1] ?? '0')}`;
}

function formatTooltipLabel(label: string, period: Period): string {
  if (period === 'year') {
    const d = new Date(label + '-02');
    const month = d.toLocaleDateString('es-AR', { month: 'long' });
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${d.getFullYear()}`;
  }
  const parts = label.split('-');
  return `${parseInt(parts[2] ?? '0')}/${parseInt(parts[1] ?? '0')}/${parts[0]}`;
}

interface SalesChartProps {
  data: DayData[];
  period: Period;
  color?: string;
  gradientId: string;
}

export function SalesChart({ data, period, color = '#6366f1', gradientId }: SalesChartProps) {
  const glowId = `${gradientId}Glow`;

  return (
    <div className="[&_svg]:outline-none [&_*:focus]:outline-none">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="60%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatXAxisTick(value, period)}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval={period === 'year' ? 0 : 4}
          />
          <YAxis
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), 'Total ventas']}
            labelFormatter={(label) => formatTooltipLabel(String(label), period)}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'white',
              boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
              fontSize: '12px',
            }}
            wrapperStyle={{ outline: 'none' }}
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            animationDuration={800}
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: 'hsl(var(--card))',
              strokeWidth: 2,
              filter: `url(#${glowId})`,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
