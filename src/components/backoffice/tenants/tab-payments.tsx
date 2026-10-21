'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { TenantPaymentHistory, TenantPaymentRow } from '@/app/services/backoffice/tenant-payments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPaymentDate } from '@/lib/tenant-payment-values';
import type { TenantPaymentListValues } from '@/schemas/backoffice/tenant-payment-schema';

import { DeletePaymentDialog } from './payments/delete-payment-dialog';
import { PaymentDialog } from './payments/payment-dialog';

interface TabPaymentsProps {
  ownerId: number;
  data: TenantPaymentHistory;
  filters: TenantPaymentListValues;
  defaultPlan: string;
  planControlDate: string | null;
}

export function TabPayments({ ownerId, data, filters, defaultPlan, planControlDate }: TabPaymentsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<TenantPaymentRow | 'new' | null>(null);
  const [deleting, setDeleting] = useState<TenantPaymentRow | null>(null);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'pagos');
    if (key !== 'paymentPage') params.delete('paymentPage');
    if (value === 'all' || value === '1') params.delete(key);
    else params.set(key, value);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  return (
    <div className="space-y-3" aria-busy={isPending}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Select
            value={filters.currency}
            onValueChange={(value) => updateFilter('paymentCurrency', value)}
            disabled={isPending}
          >
            <SelectTrigger className="w-[170px]" aria-label="Filtrar por moneda">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las monedas</SelectItem>
              <SelectItem value="ARS">Pesos (ARS)</SelectItem>
              <SelectItem value="USD">Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.method}
            onValueChange={(value) => updateFilter('paymentMethod', value)}
            disabled={isPending}
          >
            <SelectTrigger className="w-[170px]" aria-label="Filtrar por método">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los métodos</SelectItem>
              <SelectItem value="cash">Efectivo</SelectItem>
              <SelectItem value="transfer">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="sm:ml-auto" disabled={isPending} onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" />
          Registrar pago
        </Button>
      </div>
      {data.docs.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            filters.currency !== 'all' || filters.method !== 'all'
              ? 'No hay pagos con estos filtros'
              : 'Este tenant no tiene pagos registrados'
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Fecha de pago</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-px text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.docs.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="font-medium">{payment.planLabel}</div>
                    <div className="text-xs text-muted-foreground">Registró {payment.registeredByName}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatPaymentDate(payment.periodStart)} → {formatPaymentDate(payment.periodEnd)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatPaymentDate(payment.paidAt)}</TableCell>
                  <TableCell>{payment.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                    <Badge variant="outline" className="mr-2">
                      {payment.currency}
                    </Badge>
                    {new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                      payment.amount,
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          aria-label={`Acciones del pago ${payment.id}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(payment)}>
                          <Pencil className="h-4 w-4" />
                          Editar pago
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(payment)}>
                          <Trash2 className="h-4 w-4" />
                          Eliminar pago
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {data.totalDocs} {data.totalDocs === 1 ? 'pago' : 'pagos'} · Página {data.page} de {data.totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={isPending || data.page <= 1}
            onClick={() => updateFilter('paymentPage', String(data.page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Página siguiente"
            disabled={isPending || data.page >= data.totalPages}
            onClick={() => updateFilter('paymentPage', String(data.page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editing !== null && (
        <PaymentDialog
          ownerId={ownerId}
          payment={editing === 'new' ? null : editing}
          plans={data.plans}
          defaultPlan={defaultPlan}
          planControlDate={planControlDate}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && <DeletePaymentDialog ownerId={ownerId} payment={deleting} onClose={() => setDeleting(null)} />}
    </div>
  );
}
