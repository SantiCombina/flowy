'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SignupsChartProps {
  data: Array<{ monthIso: string; label: string; count: number }>;
}

export function SignupsChart({ data }: SignupsChartProps) {
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return (
      <div className="flex h-55 items-center justify-center">
        <p className="text-sm text-muted-foreground">Sin nuevos registros en los últimos 12 meses</p>
      </div>
    );
  }

  const gradientId = 'signupsGradient';
  const glowId = `${gradientId}Glow`;

  return (
    <div className="[&_svg]:outline-none [&_*:focus]:outline-none" style={{ overflow: 'visible' }}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#2563eb" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2563eb14" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            content={<CustomTooltip />}
            wrapperStyle={{ outline: 'none', zIndex: 9999 }}
            cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2563eb"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            animationDuration={800}
            dot={false}
            activeDot={{
              r: 5,
              fill: '#2563eb',
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-gray-900 mb-1">{label}</p>
      <p className="text-gray-500">
        <span className="font-semibold text-gray-900">{item.value}</span> registro{item.value === 1 ? '' : 's'}
      </p>
    </div>
  );
}
