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

export function SalesChart({ data, period, color = '#10b981', gradientId }: SalesChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
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
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            backgroundColor: 'hsl(var(--card))',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
