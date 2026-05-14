import { Package, ShoppingCart, Star, Users, Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';

import type { Period, SellerDashboardStats } from '@/app/services/dashboard';
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
  day: 'Mis ventas de hoy',
  week: 'Mis ventas de la semana',
  month: 'Mis ventas del mes',
  year: 'Mis ventas del año',
};

const PERIOD_CHART_LABEL: Record<Period, string> = {
  day: 'últimos 7 días',
  week: 'últimos 7 días',
  month: 'últimos 30 días',
  year: 'este año',
};

interface SellerDashboardProps {
  stats: SellerDashboardStats;
  userName: string;
  period: Period;
  onPeriodChange: (period: Period) => void;
  isPending: boolean;
}

export function SellerDashboard({ stats, userName, period, onPeriodChange, isPending }: SellerDashboardProps) {
  const maxInventoryQty = stats.inventory.length > 0 ? Math.max(...stats.inventory.map((i) => i.quantity)) : 1;
  const totalProductQuantity = stats.topProducts.reduce((sum, p) => sum + p.quantity, 0) || 1;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
      <PageHeader
        title={`¡Hola, ${userName.split(' ')[0]}!`}
        description="Tu desempeño de este período"
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
            title="Mis ventas"
            value={String(stats.salesCount.current)}
            change={stats.salesCount.change}
            period={period}
            icon={ShoppingCart}
            gradient="from-blue-500 to-indigo-600"
            delay={75}
          />
          <StatCard
            title="Mis clientes"
            value={String(stats.clientsCount)}
            subtitle="en tu cartera"
            icon={Users}
            gradient="from-violet-500 to-purple-600"
            delay={150}
          />
          <StatCard
            title="Mi inventario"
            value={String(stats.inventoryItems)}
            subtitle={`${stats.inventoryUnits} unidades totales`}
            icon={Package}
            gradient="from-amber-500 to-orange-600"
            delay={225}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mis ventas · {PERIOD_CHART_LABEL[period]}</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesChart data={stats.salesByDay} period={period} color="#3b82f6" gradientId="sellerSalesGradient" />
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

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-amber-500" />
                Mis productos más vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {stats.topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin ventas registradas este período</p>
              ) : (
                stats.topProducts.map((product, i) => {
                  const pct = Math.round((product.quantity / totalProductQuantity) * 100);
                  return (
                    <div key={product.name} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">#{i + 1}</span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
                          <span className="truncate font-medium">{product.name}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-muted-foreground">{product.quantity} uds.</span>
                            <span className="text-xs font-semibold">{formatCurrency(product.revenue)}</span>
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
              <CardTitle className="text-base">Mi inventario actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {stats.inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-1 py-6 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/70" />
                  <p className="text-sm text-muted-foreground">No tenés stock asignado</p>
                </div>
              ) : (
                stats.inventory.slice(0, 7).map((item) => (
                  <div key={item.variantId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="truncate font-medium">{item.productName}</span>
                        {item.presentationName && (
                          <span className="ml-1 text-xs text-muted-foreground">· {item.presentationName}</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0">
                        {item.quantity} uds.
                      </Badge>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-amber-400 to-orange-500 transition-all duration-700"
                        style={{ width: `${Math.round((item.quantity / maxInventoryQty) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mis últimas ventas</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {stats.recentSales.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Aún no registraste ventas</p>
            ) : (
              <div className="space-y-2">
                {stats.recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md bg-muted/40 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sale.clientName ?? 'Sin registrar'}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.itemCount} producto{sale.itemCount !== 1 ? 's' : ''} · {formatShortDate(sale.date)}
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
