'use client';

import { format } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Pencil,
  RefreshCw,
  Trash2,
  Truck,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { SaleRow } from '@/app/services/sales';
import { PageHeader } from '@/components/layout/page-header';
import { ActionMenu } from '@/components/ui/action-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { ColumnHeaderDateFilter } from '@/components/ui/column-header-date-filter';
import { ColumnHeaderFilter } from '@/components/ui/column-header-filter';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import type { DateRangeValue } from '@/components/ui/date-range-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/contexts/settings-context';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useSalesUrlSync } from '@/hooks/use-sales-url-sync';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatDateParts, formatShortDate } from '@/lib/utils';
import type { Zone } from '@/payload-types';
import type { GetSalesListValues } from '@/schemas/sales/sales-list-schema';

import { deleteSaleAction, getSalesAction, markAsDeliveredAction } from './actions';
import { CollectSaleModal } from './collect-sale-modal';
import { EditSaleModal } from './edit-sale-modal';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
};

type StatusFilter = 'all' | 'pending' | 'collected';

type SortKey =
  | 'date'
  | 'seller'
  | 'client'
  | 'items'
  | 'total'
  | 'paymentMethod'
  | 'paymentStatus'
  | 'deliveryStatus'
  | 'zone';

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

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
  return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

interface SortableHeadProps {
  column: SortKey;
  label: string;
  className?: string;
  sortKey: SortKey | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}

const SortableHead = memo(function SortableHead({
  column,
  label,
  className,
  sortKey,
  sortDir,
  onSort,
}: SortableHeadProps) {
  return (
    <TableHead
      className={className}
      aria-sort={sortKey === column ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'flex items-center gap-1 hover:text-foreground transition-colors',
          className?.includes('text-right') && 'w-full justify-end',
        )}
      >
        {label}
        <SortIcon column={column} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </TableHead>
  );
});

interface SalesSectionProps {
  initialFilters: GetSalesListValues;
  initialResult: {
    sales: SaleRow[];
    totalCount: number;
    totalPages: number;
    page: number;
  };
  zones: Zone[];
  showSellerColumn: boolean;
  canCollect: boolean;
  canManage: boolean;
  isSeller: boolean;
  initialStatusFilter?: StatusFilter;
}

function SalesSectionComponent({
  initialFilters,
  initialResult,
  zones,
  showSellerColumn,
  canCollect,
  canManage,
  isSeller,
  initialStatusFilter,
}: SalesSectionProps) {
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('sales');
  const { invalidateQueries } = useInvalidateQueries();

  const getStatus = (sale: SaleRow) => (isSeller ? sale.paymentStatus : sale.ownerPaymentStatus);
  const getAmountPaid = (sale: SaleRow) => (isSeller ? sale.amountPaid : sale.ownerAmountPaid);

  const [filters, setFilters] = useState<GetSalesListValues>(() => {
    if (initialStatusFilter && initialStatusFilter !== 'all' && !initialFilters.paymentStatus) {
      return { ...initialFilters, paymentStatus: initialStatusFilter, page: 1 };
    }
    return initialFilters;
  });

  useSalesUrlSync(filters, setFilters);

  const { data, isPending, isError, error, refetch } = useServerActionQuery({
    queryKey: queryKeys.sales.list(filters),
    queryFn: () => getSalesAction(filters),
    initialData: { success: true, ...initialResult },
    placeholderData: (previousData) => previousData,
    staleTime: 10_000,
  });

  const salesData = data?.sales ?? initialResult.sales;
  const totalCount = data?.totalCount ?? initialResult.totalCount;
  const totalPages = data?.totalPages ?? initialResult.totalPages;
  const currentPage = data?.page ?? initialResult.page;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [collectingModal, setCollectingModal] = useState<{
    saleId: number;
    total: number;
    amountPaid: number;
  } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deliverConfirmId, setDeliverConfirmId] = useState<number | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRow | null>(null);

  const { executeAsync: executeDelete, isExecuting: isDeleting } = useAction(deleteSaleAction);
  const { executeAsync: executeMarkDelivered, isExecuting: isMarkingDelivered } = useAction(markAsDeliveredAction);

  const handleCollectSuccess = useCallback(() => {
    invalidateQueries([queryKeys.sales.list(filters)]);
    setCollectingModal(null);
  }, [invalidateQueries, filters, setCollectingModal]);

  const handleMarkDelivered = async (saleId: number) => {
    const result = await executeMarkDelivered({ saleId });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Venta marcada como entregada.');
      invalidateQueries([queryKeys.sales.list(filters)]);
    }
  };

  const handleEditSuccess = () => {
    toast.success('Venta editada');
    setEditingSale(null);
    invalidateQueries([queryKeys.sales.list(filters)]);
  };

  const handleDelete = async (saleId: number) => {
    const result = await executeDelete({ saleId });
    setDeleteConfirmId(null);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.warning('Venta eliminada');
      invalidateQueries([queryKeys.sales.list(filters)]);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (key: string) => {
    setFilters((prev) => {
      const nextSort = key as SortKey;
      if (prev.sort === nextSort) {
        return { ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc', page: 1 };
      }
      return { ...prev, sort: nextSort, sortDir: 'asc', page: 1 };
    });
  };

  const handleFilterChange = (key: keyof GetSalesListValues, value: string | number | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDateRangeChange = (range: DateRangeValue | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateFrom: range ? format(range.from, 'yyyy-MM-dd') : undefined,
      dateTo: range ? format(range.to, 'yyyy-MM-dd') : undefined,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setFilters((prev) => ({ ...prev, limit: limit as GetSalesListValues['limit'], page: 1 }));
  };

  const dateRangeValue = useMemo<DateRangeValue | undefined>(() => {
    if (!filters.dateFrom || !filters.dateTo) return undefined;
    return { from: new Date(filters.dateFrom), to: new Date(filters.dateTo) };
  }, [filters.dateFrom, filters.dateTo]);

  const showSeller = showSellerColumn && visibleColumns.includes('seller');

  const visibleOptionalCount =
    (['date', 'client', 'zone', 'items', 'total', 'paymentMethod', 'paymentStatus'] as const).filter((k) =>
      visibleColumns.includes(k),
    ).length + (showSeller ? 1 : 0);

  const canMarkDelivery = canCollect || isSeller;
  const hasActions = canManage || canCollect || canMarkDelivery;
  const totalCols = visibleOptionalCount + 1 + 1 + (hasActions ? 1 : 0);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Ventas"
        description="Registro y seguimiento de ventas"
        actions={<ColumnVisibilityDropdown tableName="sales" excludeColumns={showSellerColumn ? [] : ['seller']} />}
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          {isError && (
            <Alert variant="destructive">
              <AlertTitle>Error al cargar ventas</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                {error?.message ?? 'Ocurrió un error inesperado.'}
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-xl bg-card shadow-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('date') && (
                    <ColumnHeaderDateFilter
                      title="Fecha"
                      sortKey="date"
                      currentSortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                      value={dateRangeValue}
                      onChange={handleDateRangeChange}
                      className="w-px"
                    />
                  )}
                  {showSeller && (
                    <SortableHead
                      column="seller"
                      label="Vendedor"
                      sortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.includes('client') && (
                    <SortableHead
                      column="client"
                      label="Cliente"
                      sortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.includes('zone') && (
                    <ColumnHeaderFilter
                      title="Zona"
                      sortKey="zone"
                      currentSortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                      filterOptions={[
                        { value: '', label: 'Todas' },
                        ...zones.map((z) => ({ value: String(z.id), label: z.name })),
                      ]}
                      filterValue={filters.zone !== undefined ? String(filters.zone) : ''}
                      onFilterChange={(v) => handleFilterChange('zone', v ? parseInt(v, 10) : undefined)}
                      className="w-px"
                    />
                  )}
                  {visibleColumns.includes('items') && (
                    <SortableHead
                      column="items"
                      label="Ítems"
                      className="w-px text-center"
                      sortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.includes('total') && (
                    <SortableHead
                      column="total"
                      label="Total"
                      className="w-px text-right"
                      sortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.includes('paymentMethod') && (
                    <ColumnHeaderFilter
                      title="Pago"
                      sortKey="paymentMethod"
                      currentSortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                      filterOptions={[
                        { value: '', label: 'Todos' },
                        { value: 'cash', label: 'Efectivo' },
                        { value: 'transfer', label: 'Transferencia' },
                        { value: 'check', label: 'Cheque' },
                        { value: '__credit__', label: 'A crédito' },
                      ]}
                      filterValue={filters.paymentMethod ?? ''}
                      onFilterChange={(v) => handleFilterChange('paymentMethod', v || undefined)}
                      className="w-px"
                    />
                  )}
                  {visibleColumns.includes('paymentStatus') && (
                    <ColumnHeaderFilter
                      title="Estado"
                      sortKey="paymentStatus"
                      currentSortKey={filters.sort ?? null}
                      sortDir={filters.sortDir ?? 'desc'}
                      onSort={handleSort}
                      filterOptions={[
                        { value: '', label: 'Todos' },
                        { value: 'pending', label: 'Pendiente' },
                        { value: 'collected', label: 'Cobrado' },
                      ]}
                      filterValue={filters.paymentStatus ?? ''}
                      onFilterChange={(v) => handleFilterChange('paymentStatus', v || undefined)}
                      className="w-px"
                    />
                  )}
                  <ColumnHeaderFilter
                    title="Entrega"
                    sortKey="deliveryStatus"
                    currentSortKey={filters.sort ?? null}
                    sortDir={filters.sortDir ?? 'desc'}
                    onSort={handleSort}
                    filterOptions={[
                      { value: '', label: 'Todas' },
                      { value: 'pending', label: 'Pendiente' },
                      { value: 'delivered', label: 'Entregado' },
                    ]}
                    filterValue={filters.deliveryStatus ?? ''}
                    onFilterChange={(v) => handleFilterChange('deliveryStatus', v || undefined)}
                    className="w-px"
                  />
                  {hasActions && <TableHead className="w-px" />}
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending && salesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalCols}>
                      <EmptyState icon={Inbox} title="Cargando ventas" description="" />
                    </TableCell>
                  </TableRow>
                ) : salesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalCols}>
                      <EmptyState
                        icon={Inbox}
                        title="No hay ventas"
                        description="No se encontraron ventas registradas."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  salesData.map((sale) => {
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
                          className={cn(
                            'cursor-pointer hover:bg-muted/50 animate-in fade-in duration-150',
                            isExpanded && 'border-b-0',
                          )}
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
                          {visibleColumns.includes('zone') && (
                            <TableCell className="text-muted-foreground">{sale.clientZoneName ?? '-'}</TableCell>
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
                                  className={cn(
                                    'ml-1.5 text-xs',
                                    isOverdue ? 'text-destructive' : 'text-muted-foreground',
                                  )}
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
                              <div className="rounded-md bg-background overflow-hidden shadow-sm">
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
                                      <p className={cn('font-medium', isOverdue && 'text-destructive')}>
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
                                      <p className="font-medium text-warning">
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
              <span className="hidden sm:inline">Filas por página</span>
              <Select value={String(filters.limit)} onValueChange={(v) => handleLimitChange(Number(v))}>
                <SelectTrigger aria-label="Filas por página" className="h-9 w-auto px-3">
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

            <div className="flex items-center gap-2 sm:gap-3">
              <span>
                {totalCount === 0 ? (
                  '0 resultados'
                ) : (
                  <>
                    <span className="sm:hidden">
                      {currentPage}/{totalPages}
                    </span>
                    <span className="hidden sm:inline">
                      {(currentPage - 1) * filters.limit + 1}–{Math.min(currentPage * filters.limit, totalCount)} de{' '}
                      {totalCount}
                    </span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isPending}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isPending}
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
              variant="destructive"
              onClick={() => deleteConfirmId !== null && void handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const SalesSection = memo(SalesSectionComponent);
