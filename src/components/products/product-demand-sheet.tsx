'use client';

import { Calendar, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { PopulatedProductVariant } from '@/app/services/products';
import type { MonthlyDemand } from '@/app/services/sales';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatCurrency } from '@/lib/utils';

import { getVariantSalesHistoryAction } from './actions';

interface ProductDemandSheetProps {
  variant: PopulatedProductVariant | null;
  onClose: () => void;
}

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function formatMonth(month: string): string {
  const date = new Date(month + '-02');
  return MONTH_ABBR[date.getMonth()] ?? '';
}

function formatMonthFull(month: string): string {
  const date = new Date(month + '-02');
  return `${MONTH_FULL[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getBarColor(entry: MonthlyDemand, maxUnits: number): string {
  if (maxUnits === 0) return 'hsl(var(--muted))';
  const ratio = entry.units / maxUnits;
  if (ratio >= 0.8) return 'hsl(var(--primary))';
  if (ratio >= 0.4) return 'hsl(var(--primary) / 0.65)';
  if (ratio > 0) return 'hsl(var(--primary) / 0.35)';
  return 'hsl(var(--muted))';
}

export function ProductDemandSheet({ variant, onClose }: ProductDemandSheetProps) {
  const { execute, result, isPending, reset } = useAction(getVariantSalesHistoryAction);

  useEffect(() => {
    if (variant) {
      execute({ variantId: variant.id });
    } else {
      reset();
    }
  }, [variant, execute, reset]);

  const history = result?.data?.history;

  const productName = variant?.product.name ?? '';
  const presentationLabel = variant?.presentation?.label;
  const brandName =
    variant?.product.brand && typeof variant.product.brand === 'object' ? variant.product.brand.name : null;

  const maxUnits = history ? Math.max(...history.monthly.map((m) => m.units), 1) : 1;

  return (
    <Sheet
      open={variant !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-y-auto">
        <div className="px-4 sm:px-6 pt-6 pb-5 border-b bg-muted/30 pr-12">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Análisis de demanda
          </p>
          <SheetTitle className="text-base font-semibold leading-snug text-foreground">{productName}</SheetTitle>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {presentationLabel && (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                {presentationLabel}
              </span>
            )}
            {brandName && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {brandName}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-5 space-y-6">
          {isPending && (
            <div className="space-y-4 animate-pulse">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
              <Skeleton className="h-55 rounded-xl" />
            </div>
          )}

          {!isPending && history && (
            <>
              <div className="flex flex-col gap-3">
                <MetricCard
                  icon={Calendar}
                  label="Última venta"
                  value={history.lastSoldAt ? formatDate(history.lastSoldAt) : '—'}
                  empty={!history.lastSoldAt}
                  delay={0}
                />
                <MetricCard
                  icon={Package}
                  label="Unidades este mes"
                  value={history.currentMonth.units > 0 ? String(history.currentMonth.units) : '—'}
                  empty={history.currentMonth.units === 0}
                  currentRaw={history.currentMonth.units}
                  previousValue={history.previousMonth.units}
                  delay={60}
                />
                <MetricCard
                  icon={TrendingUp}
                  label="Ingresos este mes"
                  value={history.currentMonth.revenue > 0 ? formatCurrency(history.currentMonth.revenue) : '—'}
                  empty={history.currentMonth.revenue === 0}
                  currentRaw={history.currentMonth.revenue}
                  previousValue={history.previousMonth.revenue}
                  delay={120}
                />
              </div>

              <div
                className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-[both]"
                style={{ animationDelay: '180ms' }}
              >
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Unidades · últimos 12 meses
                  </p>
                </div>

                <div className="rounded-xl border bg-card px-2 py-3 [&_svg]:outline-none [&_*:focus]:outline-none">
                  {history.totalUnits === 0 ? (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Sin ventas registradas</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={history.monthly}
                        margin={{ top: 4, right: 4, left: -10, bottom: -10 }}
                        barCategoryGap="28%"
                        style={{ outline: 'none' }}
                      >
                        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickFormatter={formatMonth}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          width={32}
                        />
                        <Tooltip
                          cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 4 }}
                          formatter={(value, name) =>
                            name === 'units'
                              ? [`${value} uds.`, 'Unidades']
                              : [formatCurrency(value as number), 'Ingresos']
                          }
                          labelFormatter={(label) => formatMonthFull(String(label))}
                          contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid hsl(var(--border))',
                            backgroundColor: 'hsl(var(--card))',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          }}
                        />
                        <Bar dataKey="units" radius={[4, 4, 0, 0]} maxBarSize={36}>
                          {history.monthly.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry, maxUnits)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}

          {!isPending && !history && result?.serverError && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <p className="text-sm text-destructive">{result.serverError}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  empty?: boolean;
  currentRaw?: number;
  previousValue?: number;
  delay: number;
}

function MetricCard({ icon: Icon, label, value, empty = false, currentRaw, previousValue, delay }: MetricCardProps) {
  const change =
    currentRaw !== undefined && previousValue !== undefined && previousValue > 0
      ? Math.round(((currentRaw - previousValue) / previousValue) * 100)
      : null;

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-[both]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground leading-none mb-1">{label}</p>
            <p className={cn('text-sm font-bold leading-none tracking-tight', empty && 'text-muted-foreground/50')}>
              {value}
            </p>
          </div>
        </div>
        {change !== null && (
          <div
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium',
              change >= 0 ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {change >= 0 ? '+' : ''}
              {change}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
