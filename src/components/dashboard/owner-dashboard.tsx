import { AlertTriangle, ImageOff, Package, ShoppingCart, TrendingUp, Users, Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import type { OwnerDashboardStats, Period } from '@/app/services/dashboard';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatShortDate } from '@/lib/utils';

import { PeriodSelector } from './period-selector';
import { StatCard } from './stat-card';

const SalesChart = dynamic(() => import('./sales-chart').then((m) => m.SalesChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-xl bg-muted" />,
});
const PaymentMethodsChart = dynamic(() => import('./payment-methods-chart').then((m) => m.PaymentMethodsChart), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-xl bg-muted" />,
});

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
};

const PERIOD_REVENUE_LABEL: Record<Period, string> = {
  day: 'Ventas de hoy',
  week: 'Ventas de la semana',
  month: 'Ventas del mes',
  year: 'Ventas del año',
};

const PERIOD_NEW_CLIENTS_LABEL: Record<Period, string> = {
  day: 'nuevos hoy',
  week: 'nuevos esta semana',
  month: 'nuevos este mes',
  year: 'nuevos este año',
};

const PERIOD_CHART_LABEL: Record<Period, string> = {
  day: 'últimos 7 días',
  week: 'últimos 7 días',
  month: 'últimos 30 días',
  year: 'este año',
};

interface OwnerDashboardProps {
  stats: OwnerDashboardStats;
  userName: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
  isPending: boolean;
}

export function OwnerDashboard({ stats, userName, period, onPeriodChange, isPending }: OwnerDashboardProps) {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const totalSellerRevenue = stats.salesBySeller.reduce((sum, s) => sum + s.total, 0) || 1;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
      <PageHeader
        title={`Buen día, ${userName.split(' ')[0]}!`}
        description={`Resumen de tu negocio · ${capitalizedMonth}`}
        actions={<PeriodSelector period={period} onPeriodChange={onPeriodChange} disabled={isPending} />}
      />

      <main
        className={`flex-1 space-y-6 px-4 pb-6 sm:px-6 transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 xl:grid-cols-4">
          <StatCard
            title={PERIOD_REVENUE_LABEL[period]}
            value={formatCurrency(stats.revenue.current)}
            change={stats.revenue.change}
            period={period}
            icon={Wallet}
            gradient="from-emerald-500 to-teal-600"
            delay={0}
          />
          <StatCard
            title="Ventas realizadas"
            value={String(stats.salesCount.current)}
            change={stats.salesCount.change}
            period={period}
            icon={ShoppingCart}
            gradient="from-blue-500 to-indigo-600"
            delay={75}
          />
          <StatCard
            title="Clientes totales"
            value={String(stats.clientsTotal)}
            subtitle={
              stats.newClientsInPeriod > 0
                ? `+${stats.newClientsInPeriod} ${PERIOD_NEW_CLIENTS_LABEL[period]}`
                : undefined
            }
            icon={Users}
            gradient="from-violet-500 to-purple-600"
            delay={150}
          />
          <StatCard
            title="Variantes con stock"
            value={String(stats.warehouseVariantsWithStock)}
            subtitle={`de ${stats.activeProducts} variantes totales`}
            icon={Package}
            gradient="from-amber-500 to-orange-600"
            delay={225}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ventas · {PERIOD_CHART_LABEL[period]}</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesChart data={stats.salesByDay} period={period} gradientId="ownerSalesGradient" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Métodos de pago</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <PaymentMethodsChart {...stats.paymentMethods} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ranking de vendedores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {stats.salesBySeller.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin ventas registradas este período</p>
              ) : (
                stats.salesBySeller.map((seller, i) => {
                  const pct = Math.round((seller.total / totalSellerRevenue) * 100);
                  const podiumColor =
                    i === 0
                      ? 'text-warning'
                      : i === 1
                        ? 'text-slate-400'
                        : i === 2
                          ? 'text-amber-700'
                          : 'text-muted-foreground';
                  return (
                    <div key={seller.name} className="flex items-center gap-3">
                      <span className={`w-5 shrink-0 text-center text-xs font-bold ${podiumColor}`}>#{i + 1}</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
                          <span className="truncate font-medium">{seller.name}</span>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-xs text-muted-foreground">{seller.count} vtas</span>
                            <span className="font-semibold">{formatCurrency(seller.total)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-linear-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-7 shrink-0 text-right text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Alertas de stock</CardTitle>
                {stats.lowStockAlerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {stats.lowStockAlerts.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {stats.lowStockAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-1 py-6 text-center">
                  <TrendingUp className="h-8 w-8 text-emerald-500" />
                  <p className="text-sm font-medium text-success">¡Todo en orden!</p>
                  <p className="text-xs text-muted-foreground">No hay variantes con bajo stock</p>
                </div>
              ) : (
                stats.lowStockAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm shadow-sm">
                    <div className="shrink-0">
                      {alert.imageUrl ? (
                        <Image
                          src={alert.imageUrl}
                          alt={alert.name}
                          width={36}
                          height={36}
                          className="h-9 w-9 rounded object-cover"
                          sizes="36px"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{alert.name}</p>
                      <div className="flex items-center gap-1.5">
                        {alert.presentation && (
                          <span className="text-xs text-muted-foreground">{alert.presentation}</span>
                        )}
                        {alert.code && <span className="font-mono text-xs text-muted-foreground">#{alert.code}</span>}
                      </div>
                    </div>
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-0.5">
                      <Badge
                        variant={alert.stock === 0 ? 'destructive' : 'secondary'}
                        className={alert.stock > 0 ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}
                      >
                        {alert.stock === 0 ? 'Sin stock' : `${alert.stock} uds.`}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">mín. {alert.minimumStock}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Últimas ventas</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {stats.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin ventas registradas aún</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted/40 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sale.sellerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.clientName ?? 'Sin registrar'} · {formatShortDate(sale.date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {sale.paymentMethod ? PAYMENT_LABELS[sale.paymentMethod] : 'A crédito'}
                      </Badge>
                      <span className="font-semibold">{formatCurrency(sale.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
