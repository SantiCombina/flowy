'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Truck,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { SaleRow } from '@/app/services/sales';
import { PageHeader } from '@/components/layout/page-header';
import { ActionMenu } from '@/components/ui/action-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/contexts/settings-context';
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import { cn, formatDateParts, formatShortDate } from '@/lib/utils';

import { deleteSaleAction, getSalesAction, markAsDeliveredAction } from './actions';
import { CollectSaleModal } from './collect-sale-modal';
import { EditSaleModal } from './edit-sale-modal';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
};

type StatusFilter = 'all' | 'pending' | 'collected';

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  pending: 'Pendiente',
  collected: 'Cobrado',
};

type SortKey = 'date' | 'seller' | 'client' | 'items' | 'total' | 'paymentMethod' | 'paymentStatus' | 'deliveryStatus';

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isCheckOverdue(checkDueDate: string): boolean {
  return new Date(checkDueDate) < new Date();
}

function PaymentStatusBadge({ status }: { status: 'pending' | 'partially_collected' | 'collected' }) {
  if (status === 'collected') return <Badge variant="success">Cobrado</Badge>;
  if (status === 'partially_collected') return <Badge variant="warning">Parcial</Badge>;
  return <Badge variant="pending">Pendiente</Badge>;
}

function DeliveryStatusBadge({ status }: { status: 'pending' | 'delivered' }) {
  if (status === 'delivered') return <Badge variant="success">Entregado</Badge>;
  return <Badge variant="pending">Pendiente</Badge>;
}

function getSortValue(sale: SaleRow, key: SortKey, isSeller: boolean): string | number {
  switch (key) {
    case 'date':
      return sale.date;
    case 'seller':
      return sale.sellerName ?? '';
    case 'client':
      return sale.clientName ?? '';
    case 'items':
      return sale.itemCount;
    case 'total':
      return sale.total;
    case 'paymentMethod':
      return sale.paymentMethod ? (PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod) : '';
    case 'paymentStatus':
      return isSeller ? sale.paymentStatus : sale.ownerPaymentStatus;
    case 'deliveryStatus':
      return sale.deliveryStatus;
  }
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

interface SalesSectionProps {
  sales: SaleRow[];
  showSellerColumn: boolean;
  canCollect: boolean;
  canManage: boolean;
  isSeller: boolean;
  initialStatusFilter?: StatusFilter;
}

export function SalesSection({
  sales,
  showSellerColumn,
  canCollect,
  canManage,
  isSeller,
  initialStatusFilter,
}: SalesSectionProps) {
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('sales');

  const getStatus = (sale: SaleRow) => (isSeller ? sale.paymentStatus : sale.ownerPaymentStatus);
  const getAmountPaid = (sale: SaleRow) => (isSeller ? sale.amountPaid : sale.ownerAmountPaid);

  const [localSales, setLocalSales] = useState<SaleRow[]>(sales);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePersistedLimit('flowy:sales:limit', 10);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter ?? 'all');
  const [collectingModal, setCollectingModal] = useState<{
    saleId: number;
    total: number;
    amountPaid: number;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deliverConfirmId, setDeliverConfirmId] = useState<number | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRow | null>(null);

  const { executeAsync: executeDelete, isExecuting: isDeleting } = useAction(deleteSaleAction);
  const { executeAsync: executeFetchSales, isExecuting: isFetchingSales } = useAction(getSalesAction);
  const { executeAsync: executeMarkDelivered, isExecuting: isMarkingDelivered } = useAction(markAsDeliveredAction);

  useEffect(() => {
    setLocalSales(sales);
  }, [sales]);

  const handleCollectSuccess = (
    saleId: number,
    newAmountPaid: number,
    newStatus: 'partially_collected' | 'collected',
    paymentMethod: 'cash' | 'transfer' | 'check' | null,
  ) => {
    setLocalSales((prev) =>
      prev.map((s) => {
        if (s.id !== saleId) return s;
        if (isSeller) {
          return {
            ...s,
            amountPaid: newAmountPaid,
            paymentStatus: newStatus,
            collectedAt: newStatus === 'collected' ? new Date().toISOString() : s.collectedAt,
            ...(paymentMethod ? { paymentMethod } : {}),
          };
        }
        return {
          ...s,
          ownerAmountPaid: newAmountPaid,
          ownerPaymentStatus: newStatus,
          ownerCollectedAt: newStatus === 'collected' ? new Date().toISOString() : s.ownerCollectedAt,
        };
      }),
    );
    setCollectingModal(null);
  };

  const handleMarkDelivered = async (saleId: number) => {
    const result = await executeMarkDelivered({ saleId });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Venta marcada como entregada.');
      setLocalSales((prev) =>
        prev.map((s) =>
          s.id === saleId ? { ...s, deliveryStatus: 'delivered' as const, deliveredAt: new Date().toISOString() } : s,
        ),
      );
    }
  };

  const handleEditSuccess = () => {
    setEditingSale(null);
    void executeFetchSales().then((result) => {
      if (result?.data?.success) {
        setLocalSales(result.data.sales);
      }
    });
  };

  const handleDelete = async (saleId: number) => {
    const result = await executeDelete({ saleId });
    setDeleteConfirmId(null);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Venta eliminada correctamente');
      setLocalSales((prev) => prev.filter((s) => s.id !== saleId));
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortedSales = useMemo(() => {
    if (!sortKey) return localSales;
    return [...localSales].sort((a, b) => {
      const va = getSortValue(a, sortKey, isSeller);
      const vb = getSortValue(b, sortKey, isSeller);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [localSales, sortKey, sortDir, isSeller]);

  const filteredSales = useMemo(() => {
    if (statusFilter === 'all') return sortedSales;
    if (statusFilter === 'pending')
      return sortedSales.filter((s) => {
        const st = isSeller ? s.paymentStatus : s.ownerPaymentStatus;
        return st === 'pending' || st === 'partially_collected';
      });
    return sortedSales.filter((s) => (isSeller ? s.paymentStatus : s.ownerPaymentStatus) === statusFilter);
  }, [sortedSales, statusFilter, isSeller]);

  const pendingCount = localSales.filter((s) => {
    const st = isSeller ? s.paymentStatus : s.ownerPaymentStatus;
    return st === 'pending' || st === 'partially_collected';
  }).length;

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedSales = filteredSales.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const showSeller = showSellerColumn && visibleColumns.includes('seller');

  const visibleOptionalCount =
    (['date', 'client', 'items', 'total', 'paymentMethod', 'paymentStatus'] as const).filter((k) =>
      visibleColumns.includes(k),
    ).length + (showSeller ? 1 : 0);

  const canMarkDelivery = canCollect || isSeller;
  const hasActions = canManage || canCollect || canMarkDelivery;
  const totalCols = visibleOptionalCount + 1 + 1 + (hasActions ? 1 : 0);

  const sortableHead = (key: SortKey, label: string, className?: string) => (
    <TableHead
      className={className}
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => handleSort(key)}
        className={cn(
          'flex items-center gap-1 hover:text-foreground transition-colors',
          className?.includes('text-right') && 'w-full justify-end',
        )}
      >
        {label}
        <SortIcon column={key} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Ventas" description="Registro y seguimiento de ventas" isLoading={isFetchingSales} />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center rounded-lg border bg-muted/40 p-1 gap-0.5"
            role="group"
            aria-label="Filtrar por estado"
          >
            {(['all', 'pending', 'collected'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setStatusFilter(filter);
                  setPage(1);
                }}
                aria-pressed={statusFilter === filter}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  statusFilter === filter
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {STATUS_FILTER_LABELS[filter]}
                {filter === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="ml-auto">
            <ColumnVisibilityDropdown tableName="sales" excludeColumns={showSellerColumn ? [] : ['seller']} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-card shadow-sm overflow-hidden border border-border/40">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('date') && sortableHead('date', 'Fecha', 'w-px')}
                  {showSeller && sortableHead('seller', 'Vendedor')}
                  {visibleColumns.includes('client') && sortableHead('client', 'Cliente')}
                  {visibleColumns.includes('items') && sortableHead('items', 'Ítems', 'w-px text-center')}
                  {visibleColumns.includes('total') && sortableHead('total', 'Total', 'w-px text-right')}
                  {visibleColumns.includes('paymentMethod') && sortableHead('paymentMethod', 'Pago', 'w-px')}
                  {visibleColumns.includes('paymentStatus') && sortableHead('paymentStatus', 'Estado', 'w-px')}
                  {sortableHead('deliveryStatus', 'Entrega', 'w-px')}
                  {hasActions && <TableHead className="w-px" />}
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalCols} className="py-10 text-center text-muted-foreground">
                      No hay ventas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale) => {
                    const isExpanded = expandedId === sale.id;
                    const displayStatus = getStatus(sale);
                    const displayAmountPaid = getAmountPaid(sale);
                    const isOverdue =
                      sale.paymentMethod === 'check' &&
                      displayStatus !== 'collected' &&
                      !!sale.checkDueDate &&
                      isCheckOverdue(sale.checkDueDate);
                    const isPending = displayStatus === 'pending' || displayStatus === 'partially_collected';

                    return (
                      <Fragment key={sale.id}>
                        <TableRow
                          className={cn('cursor-pointer', isExpanded && 'border-b-0')}
                          onClick={() => toggleExpand(sale.id)}
                        >
                          {visibleColumns.includes('date') && (
                            <TableCell className="whitespace-nowrap">
                              {(() => {
                                const { date, time } = formatDateParts(sale.date);
                                return (
                                  <div className="flex flex-col leading-snug">
                                    <span className="text-sm text-foreground">{date}</span>
                                    <span className="text-xs text-muted-foreground">{time}</span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                          )}
                          {showSeller && <TableCell className="font-medium">{sale.sellerName}</TableCell>}
                          {visibleColumns.includes('client') && (
                            <TableCell className="text-muted-foreground">
                              {sale.clientName ?? 'Sin registrar'}
                            </TableCell>
                          )}
                          {visibleColumns.includes('items') && (
                            <TableCell className="text-center tabular-nums">{sale.itemCount}</TableCell>
                          )}
                          {visibleColumns.includes('total') && (
                            <TableCell className="text-right font-medium tabular-nums">
                              $ {formatPrice(sale.total)}
                            </TableCell>
                          )}
                          {visibleColumns.includes('paymentMethod') && (
                            <TableCell className="text-muted-foreground">
                              <span>
                                {sale.paymentMethod
                                  ? (PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod)
                                  : 'A crédito'}
                              </span>
                              {sale.checkDueDate && (
                                <span
                                  className={cn('ml-1.5 text-xs', isOverdue ? 'text-red-500' : 'text-muted-foreground')}
                                >
                                  · {formatShortDate(sale.checkDueDate)}
                                  {isOverdue && ' (listo para cobrar)'}
                                </span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('paymentStatus') && (
                            <TableCell>
                              <PaymentStatusBadge status={displayStatus} />
                            </TableCell>
                          )}
                          <TableCell>
                            <DeliveryStatusBadge status={sale.deliveryStatus} />
                          </TableCell>
                          {hasActions && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <ActionMenu
                                items={[
                                  canCollect &&
                                    isPending && {
                                      label: 'Cobrar',
                                      icon: Banknote,
                                      onClick: () =>
                                        setCollectingModal({
                                          saleId: sale.id,
                                          total: sale.total,
                                          amountPaid: displayAmountPaid,
                                        }),
                                    },
                                  canMarkDelivery &&
                                    sale.deliveryStatus === 'pending' && {
                                      label: 'Marcar entregada',
                                      icon: Truck,
                                      onClick: () => setDeliverConfirmId(sale.id),
                                    },
                                  canManage && {
                                    label: 'Editar',
                                    icon: Pencil,
                                    onClick: () => setEditingSale(sale),
                                    separator: !!(canCollect || canMarkDelivery),
                                  },
                                  canManage && {
                                    label: 'Eliminar',
                                    icon: Trash2,
                                    onClick: () => setDeleteConfirmId(sale.id),
                                    variant: 'destructive' as const,
                                  },
                                ]}
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right pr-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(sale.id);
                              }}
                            >
                              <ChevronDown
                                className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', {
                                  'rotate-180': isExpanded,
                                })}
                              />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={totalCols} className="px-6 pb-4 pt-0 bg-muted/30">
                              <div className="rounded-md border bg-background overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                                        Producto
                                      </th>
                                      <th className="px-4 py-2 text-center font-medium text-muted-foreground w-24">
                                        Cant.
                                      </th>
                                      <th className="px-4 py-2 text-right font-medium text-muted-foreground w-32">
                                        Precio unit.
                                      </th>
                                      <th className="px-4 py-2 text-right font-medium text-muted-foreground w-32">
                                        Subtotal
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sale.items.map((item, i) => (
                                      <tr key={i} className="border-b last:border-0">
                                        <td className="px-4 py-2">{item.variantName}</td>
                                        <td className="px-4 py-2 text-center tabular-nums text-muted-foreground">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                                          $ {formatPrice(item.unitPrice)}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums font-medium">
                                          $ {formatPrice(item.subtotal)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {(sale.checkDueDate || displayAmountPaid > 0 || sale.deliveredAt) && (
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-3 text-sm sm:grid-cols-4">
                                  {sale.checkDueDate && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Fecha cobro cheque</p>
                                      <p className={cn('font-medium', isOverdue && 'text-red-600')}>
                                        {formatShortDate(sale.checkDueDate)}
                                        {isOverdue && ' · Listo para cobrar'}
                                      </p>
                                    </div>
                                  )}
                                  {displayAmountPaid > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Cobrado</p>
                                      <p className="font-medium">$ {formatPrice(displayAmountPaid)}</p>
                                    </div>
                                  )}
                                  {displayStatus === 'partially_collected' && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Restante</p>
                                      <p className="font-medium text-orange-600">
                                        $ {formatPrice(sale.total - displayAmountPaid)}
                                      </p>
                                    </div>
                                  )}
                                  {(isSeller ? sale.collectedAt : sale.ownerCollectedAt) && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Cobrado el</p>
                                      <p className="font-medium">
                                        {formatShortDate((isSeller ? sale.collectedAt : sale.ownerCollectedAt)!)}
                                      </p>
                                    </div>
                                  )}
                                  {sale.deliveredAt && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Entregado el</p>
                                      <p className="font-medium">{formatShortDate(sale.deliveredAt)}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {sale.notes && (
                                <div className="py-2 text-sm">
                                  <p className="text-xs text-muted-foreground">Notas</p>
                                  <p className="text-sm">{sale.notes}</p>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Filas por página</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(v) => {
                  setItemsPerPage(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-17.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                {filteredSales.length === 0
                  ? '0 resultados'
                  : `${(safePage - 1) * itemsPerPage + 1}–${Math.min(safePage * itemsPerPage, filteredSales.length)} de ${filteredSales.length}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={safePage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={safePage >= totalPages}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {collectingModal && (
        <CollectSaleModal
          isOpen
          onClose={() => setCollectingModal(null)}
          onSuccess={handleCollectSuccess}
          isSeller={isSeller}
          {...collectingModal}
        />
      )}

      {editingSale && (
        <EditSaleModal
          isOpen
          onClose={() => setEditingSale(null)}
          onSuccess={handleEditSuccess}
          sale={editingSale}
          isSeller={isSeller}
        />
      )}

      <AlertDialog open={deliverConfirmId !== null} onOpenChange={(open) => !open && setDeliverConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como entregada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La venta quedará registrada como entregada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarkingDelivered}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deliverConfirmId !== null && void handleMarkDelivered(deliverConfirmId)}
              disabled={isMarkingDelivered}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Truck className="mr-2 h-4 w-4" />
              {isMarkingDelivered ? 'Registrando…' : 'Confirmar entrega'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El stock de los productos será restaurado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId !== null && void handleDelete(deleteConfirmId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
