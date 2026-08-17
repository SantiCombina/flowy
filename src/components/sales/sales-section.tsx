'use client';

import { endOfDay, parseISO, startOfDay } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Inbox,
  Pencil,
  Trash2,
  Truck,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { Fragment, memo, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { SaleRow } from '@/app/services/sales';
import { useUser } from '@/components/providers/user-provider';
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
import { ColumnHeaderDateFilter } from '@/components/ui/column-header-date-filter';
import { ColumnHeaderFilter } from '@/components/ui/column-header-filter';
import type { DateRangeValue } from '@/components/ui/date-range-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/contexts/settings-context';
import { DEFAULT_ITEMS_PER_PAGE, ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { getSaleWhatsAppLink } from '@/lib/sale-whatsapp';
import { cn, formatDateParts, formatShortDate } from '@/lib/utils';
import type { Zone } from '@/payload-types';

import { deleteSaleAction, markAsDeliveredAction } from './actions';
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
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  sales: SaleRow[];
  zones: Zone[];
  showSellerColumn: boolean;
  canCollect: boolean;
  canManage: boolean;
  isSeller: boolean;
  initialStatusFilter?: StatusFilter;
}

function SalesSectionComponent({
  sales: initialSales,
  zones,
  showSellerColumn,
  canCollect,
  canManage,
  isSeller,
  initialStatusFilter,
}: SalesSectionProps) {
  const user = useUser();
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('sales');

  const [sales, setSales] = useState<SaleRow[]>(initialSales);
  type Filters = {
    page: number;
    limit: number;
    sort: SortKey;
    sortDir: 'asc' | 'desc';
    dateFrom: string;
    dateTo: string;
    paymentStatus: StatusFilter | undefined;
    zone: number | undefined;
    paymentMethod: string | undefined;
    deliveryStatus: string | undefined;
  };

  const [filters, setFilters] = useState<Filters>(() => {
    const baseFilters: Filters = {
      page: 1,
      limit: DEFAULT_ITEMS_PER_PAGE,
      sort: 'date',
      sortDir: 'desc',
      dateFrom: '',
      dateTo: '',
      paymentStatus: undefined,
      zone: undefined,
      paymentMethod: undefined,
      deliveryStatus: undefined,
    };
    if (initialStatusFilter && initialStatusFilter !== 'all') {
      baseFilters.paymentStatus = initialStatusFilter;
    }
    return baseFilters;
  });

  const filteredSales = useMemo(() => {
    let result = sales;

    if (filters.dateFrom) {
      const from = parseISO(filters.dateFrom).getTime();
      result = result.filter((s) => new Date(s.date).getTime() >= from);
    }
    if (filters.dateTo) {
      const to = parseISO(filters.dateTo).getTime();
      result = result.filter((s) => new Date(s.date).getTime() <= to);
    }
    if (filters.paymentStatus) {
      if (filters.paymentStatus === 'pending') {
        result = result.filter((s) => s.paymentStatus === 'pending' || s.paymentStatus === 'partially_collected');
      } else {
        result = result.filter((s) => s.paymentStatus === 'collected');
      }
    }
    if (filters.zone !== undefined) {
      result = result.filter((s) => s.clientZoneId === filters.zone);
    }
    if (filters.paymentMethod) {
      if (filters.paymentMethod === '__credit__') {
        result = result.filter((s) => s.paymentMethod === null);
      } else {
        result = result.filter((s) => s.paymentMethod === filters.paymentMethod);
      }
    }
    if (filters.deliveryStatus) {
      result = result.filter((s) => s.deliveryStatus === filters.deliveryStatus);
    }

    return result;
  }, [
    sales,
    filters.dateFrom,
    filters.dateTo,
    filters.paymentStatus,
    filters.zone,
    filters.paymentMethod,
    filters.deliveryStatus,
  ]);

  const sortedSales = useMemo(() => {
    if (!filters.sort) return filteredSales;

    return [...filteredSales].sort((a, b) => {
      const dir = filters.sortDir === 'asc' ? 1 : -1;
      switch (filters.sort) {
        case 'date':
          return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
        case 'seller':
          return a.sellerName.localeCompare(b.sellerName) * dir;
        case 'client':
          return (a.clientName ?? '').localeCompare(b.clientName ?? '') * dir;
        case 'items':
          return (a.itemCount - b.itemCount) * dir;
        case 'total':
          return (a.total - b.total) * dir;
        case 'paymentMethod':
          return (a.paymentMethod ?? '').localeCompare(b.paymentMethod ?? '') * dir;
        case 'paymentStatus':
          return a.paymentStatus.localeCompare(b.paymentStatus) * dir;
        case 'deliveryStatus':
          return a.deliveryStatus.localeCompare(b.deliveryStatus) * dir;
        case 'zone':
          return (a.clientZoneName ?? '').localeCompare(b.clientZoneName ?? '') * dir;
        default:
          return 0;
      }
    });
  }, [filteredSales, filters.sort, filters.sortDir]);

  const totalCount = sortedSales.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.limit));
  const safePage = Math.min(filters.page, totalPages);
  const pageData = sortedSales.slice((safePage - 1) * filters.limit, safePage * filters.limit);

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

  const handleCollectSuccess = () => {
    setCollectingModal(null);
  };

  const handleWhatsApp = (sale: SaleRow) => {
    window.open(getSaleWhatsAppLink(sale, user?.businessName ?? null), '_blank');
  };

  const handleMarkDelivered = async (saleId: number) => {
    const result = await executeMarkDelivered({ saleId });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Venta marcada como entregada.');
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId ? { ...s, deliveryStatus: 'delivered' as const, deliveredAt: new Date().toISOString() } : s,
        ),
      );
    }
  };

  const handleEditSuccess = () => {
    toast.success('Venta editada');
    setEditingSale(null);
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
      setSales((prev) => prev.filter((s) => s.id !== saleId));
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (key: string) => {
    setFilters((prev) => {
      const nextSort = key as SortKey;
      if (prev.sort === nextSort) {
        return {
          ...prev,
          sortDir: (prev.sortDir === 'asc' ? 'desc' : 'asc') as 'asc' | 'desc',
          page: 1,
        };
      }
      return { ...prev, sort: nextSort, sortDir: 'desc' as const, page: 1 };
    });
  };

  const handleFilterChange = (
    key: 'zone' | 'paymentMethod' | 'paymentStatus' | 'deliveryStatus',
    value: string | number | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDateRangeChange = (range: DateRangeValue | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateFrom: range ? startOfDay(range.from).toISOString() : '',
      dateTo: range ? endOfDay(range.to).toISOString() : '',
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setFilters((prev) => ({
      ...prev,
      limit,
      page: 1,
    }));
  };

  const dateRangeValue = useMemo<DateRangeValue | undefined>(() => {
    if (!filters.dateFrom || !filters.dateTo) return undefined;
    return { from: parseISO(filters.dateFrom), to: parseISO(filters.dateTo) };
  }, [filters.dateFrom, filters.dateTo]);

  const showSeller = showSellerColumn && visibleColumns.includes('seller');

  const visibleOptionalCount =
    (['date', 'client', 'zone', 'items', 'total', 'paymentMethod', 'paymentStatus'] as const).filter((k) =>
      visibleColumns.includes(k),
    ).length + (showSeller ? 1 : 0);

  const canMarkDelivery = canCollect || isSeller;
  const deliveryStatusColumnCount = 1;
  const actionColumnCount = 1;
  const expansionColumnCount = 1;
  const totalCols = visibleOptionalCount + deliveryStatusColumnCount + actionColumnCount + expansionColumnCount;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          <div className="rounded-xl bg-card shadow-md overflow-x-auto">
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
                        ...zones.map((z) => ({
                          value: String(z.id),
                          label: z.name,
                        })),
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
                  <TableHead className="w-px" />
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
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
                  pageData.map((sale) => {
                    const isExpanded = expandedId === sale.id;
                    const displayStatus = sale.paymentStatus;
                    const displayAmountPaid = sale.amountPaid;
                    const isOverdue =
                      sale.paymentMethod === 'check' &&
                      displayStatus !== 'collected' &&
                      !!sale.checkDueDate &&
                      isCheckOverdue(sale.checkDueDate);
                    const isPending = displayStatus === 'pending' || displayStatus === 'partially_collected';

                    return (
                      <Fragment key={`${safePage}-${sale.id}`}>
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <ActionMenu
                              items={[
                                {
                                  label: 'Enviar por WhatsApp',
                                  icon: FileText,
                                  onClick: () => handleWhatsApp(sale),
                                },
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
                                  {sale.collectedAt && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Cobrado el</p>
                                      <p className="font-medium">{formatShortDate(sale.collectedAt)}</p>
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
                      {safePage}/{totalPages}
                    </span>
                    <span className="hidden sm:inline">
                      {(safePage - 1) * filters.limit + 1}–{Math.min(safePage * filters.limit, totalCount)} de{' '}
                      {totalCount}
                    </span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => handlePageChange(safePage + 1)}
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
              {isMarkingDelivered ? (
                <span className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Registrando
                </span>
              ) : (
                <>
                  <Truck className="h-4 w-4" />
                  Confirmar entrega
                </>
              )}
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
              {isDeleting ? 'Eliminando' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const SalesSection = memo(SalesSectionComponent);
