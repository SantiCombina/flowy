'use client';

import { format, isPast } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Inbox,
  Pencil,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { BudgetRow } from '@/app/services/budgets';
import { useUser } from '@/components/providers/user-provider';
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
import type { DateRangeValue } from '@/components/ui/date-range-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/contexts/settings-context';
import { useBudgetsUrlSync } from '@/hooks/use-budgets-url-sync';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatDateParts, formatShortDate } from '@/lib/utils';
import type { GetBudgetsListValues } from '@/schemas/budgets/budget-list-schema';

import { deleteBudgetAction, getBudgetsAction } from './actions';
import { BudgetConvertDialog } from './budget-convert-dialog';
import { NewBudgetButton } from './new-budget-button';
import { NewBudgetDialog } from './new-budget-dialog';

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getWhatsAppLink(budget: BudgetRow, businessName: string | null): string {
  const name = businessName?.trim() || 'Flowy';
  const total = formatPrice(budget.total);

  const intro = budget.validUntil
    ? `Hola! desde ${name} le informamos el detalle de su pedido con vencimiento el ${formatShortDate(budget.validUntil)} y un total de $ ${total}`
    : `Hola! desde ${name} le informamos el detalle de su pedido con un total de $ ${total}`;

  const lines: string[] = [intro, ''];

  for (let i = 0; i < budget.items.length; i++) {
    const item = budget.items[i];
    lines.push(`- ${item.variantName} x${item.quantity} - $ ${formatPrice(item.unitPrice)}`);
    if (i < budget.items.length - 1) {
      lines.push('');
    }
  }

  if (budget.notes) {
    lines.push('');
    lines.push(`Notas: ${budget.notes}`);
  }

  lines.push('');
  lines.push('Mensaje enviado desde www.flowy.ar - Sistema de gestión');

  const text = encodeURIComponent(lines.join('\n'));

  if (budget.clientPhone) {
    const phone = budget.clientPhone.replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${text}`;
  }

  return `https://wa.me/?text=${text}`;
}

function StatusBadge({ status }: { status: BudgetRow['status'] }) {
  if (status === 'approved') return <Badge variant="success">Aprobado</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rechazado</Badge>;
  if (status === 'converted') return <Badge variant="default">Convertido</Badge>;
  return <Badge variant="warning">Pendiente</Badge>;
}

type SortKey = 'date' | 'seller' | 'client' | 'items' | 'total' | 'status';

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

interface BudgetsSectionProps {
  initialFilters: GetBudgetsListValues;
  initialResult: {
    budgets: BudgetRow[];
    totalCount: number;
    totalPages: number;
    page: number;
  };
  showSellerColumn: boolean;
  isSeller: boolean;
}

function BudgetsSectionComponent({ initialFilters, initialResult, showSellerColumn, isSeller }: BudgetsSectionProps) {
  const user = useUser();
  const isOwner = !isSeller;
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('budgets');
  const { invalidateQueries } = useInvalidateQueries();

  const [filters, setFilters] = useState<GetBudgetsListValues>(() => initialFilters);

  useBudgetsUrlSync(filters, setFilters);

  const isInitialQuery = useMemo(() => {
    return (
      filters.page === initialFilters.page &&
      filters.limit === initialFilters.limit &&
      filters.sort === initialFilters.sort &&
      filters.sortDir === initialFilters.sortDir &&
      filters.dateFrom === initialFilters.dateFrom &&
      filters.dateTo === initialFilters.dateTo &&
      filters.status === initialFilters.status
    );
  }, [filters, initialFilters]);

  const { data, isPending, isError, error, refetch } = useServerActionQuery({
    queryKey: queryKeys.budgets.list(filters),
    queryFn: () => getBudgetsAction(filters),
    initialData: isInitialQuery ? { success: true, ...initialResult } : undefined,
    placeholderData: (previousData) => previousData,
    staleTime: 10_000,
  });

  const budgetsData = data?.budgets ?? initialResult.budgets;
  const totalCount = data?.totalCount ?? initialResult.totalCount;
  const totalPages = data?.totalPages ?? initialResult.totalPages;
  const currentPage = data?.page ?? initialResult.page;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [convertingBudgetId, setConvertingBudgetId] = useState<number | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | undefined>(undefined);
  const [dialogKey, setDialogKey] = useState(0);

  const { executeAsync: executeDelete, isExecuting: isDeleting } = useAction(deleteBudgetAction);

  const handleOpenNew = () => {
    setEditingBudgetId(undefined);
    setDialogKey((k) => k + 1);
    setIsNewDialogOpen(true);
  };

  const handleOpenEdit = (budgetId: number) => {
    setEditingBudgetId(budgetId);
    setDialogKey((k) => k + 1);
    setIsNewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsNewDialogOpen(false);
    setEditingBudgetId(undefined);
  };

  const handleDialogSuccess = useCallback(() => {
    invalidateQueries([queryKeys.budgets.list(filters)]);
  }, [invalidateQueries, filters]);

  const handleDelete = async (budgetId: number) => {
    const result = await executeDelete({ budgetId });
    setDeleteConfirmId(null);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.warning('Presupuesto eliminado');
      invalidateQueries([queryKeys.budgets.list(filters)]);
    }
  };

  const handleWhatsApp = (budget: BudgetRow) => {
    const businessName = user?.businessName ?? null;
    window.open(getWhatsAppLink(budget, businessName), '_blank');
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = useCallback((key: string) => {
    setFilters((prev) => {
      const nextSort = key as SortKey;
      if (prev.sort === nextSort) {
        return {
          ...prev,
          sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc',
          page: 1,
        };
      }
      return { ...prev, sort: nextSort, sortDir: 'asc', page: 1 };
    });
  }, []);

  const handleFilterChange = useCallback((key: keyof GetBudgetsListValues, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleDateRangeChange = useCallback((range: DateRangeValue | undefined) => {
    setFilters((prev) => ({
      ...prev,
      dateFrom: range ? format(range.from, 'yyyy-MM-dd') : undefined,
      dateTo: range ? format(range.to, 'yyyy-MM-dd') : undefined,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setFilters((prev) => ({
      ...prev,
      limit: limit as GetBudgetsListValues['limit'],
      page: 1,
    }));
  }, []);

  const dateRangeValue = useMemo<DateRangeValue | undefined>(() => {
    if (!filters.dateFrom || !filters.dateTo) return undefined;
    return { from: new Date(filters.dateFrom), to: new Date(filters.dateTo) };
  }, [filters.dateFrom, filters.dateTo]);

  const showSeller = showSellerColumn && visibleColumns.includes('seller');

  const visibleOptionalCount = (['date', 'client', 'phone', 'items', 'total', 'validUntil', 'status'] as const).filter(
    (k) => visibleColumns.includes(k),
  ).length;
  const totalCols = visibleOptionalCount + 2;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          {isError && budgetsData.length === 0 && (
            <Alert variant="destructive">
              <AlertTitle>Error al cargar presupuestos</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                {error?.message ?? 'Ocurrió un error inesperado.'}
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <NewBudgetButton onOpen={handleOpenNew} />
          </div>

          <div className="rounded-xl bg-card shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-200">
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
                    {visibleColumns.includes('phone') && <TableHead className="w-px">Teléfono</TableHead>}
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
                    {visibleColumns.includes('validUntil') && <TableHead className="w-px">Vencimiento</TableHead>}
                    {visibleColumns.includes('status') && (
                      <ColumnHeaderFilter
                        title="Estado"
                        sortKey="status"
                        currentSortKey={filters.sort ?? null}
                        sortDir={filters.sortDir ?? 'desc'}
                        onSort={handleSort}
                        filterOptions={[
                          { value: '', label: 'Todos' },
                          { value: 'pending', label: 'Pendiente' },
                          { value: 'approved', label: 'Aprobado' },
                          { value: 'rejected', label: 'Rechazado' },
                          { value: 'converted', label: 'Convertido' },
                        ]}
                        filterValue={filters.status ?? ''}
                        onFilterChange={(v) => handleFilterChange('status', v || undefined)}
                        className="w-px"
                      />
                    )}
                    <TableHead className="w-px" />
                    <TableHead className="w-px" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPending && budgetsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={totalCols}>
                        <EmptyState icon={Inbox} title="Cargando presupuestos" description="" />
                      </TableCell>
                    </TableRow>
                  ) : budgetsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={totalCols}>
                        <EmptyState
                          icon={Inbox}
                          title="No hay presupuestos"
                          description="No se encontraron presupuestos registrados."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgetsData.map((budget) => {
                      const isExpired =
                        budget.status === 'pending' && budget.validUntil && isPast(new Date(budget.validUntil));
                      const isExpanded = expandedId === budget.id;
                      const canManage = isOwner || budget.sellerName === user?.name;

                      return (
                        <Fragment key={budget.id}>
                          <TableRow
                            className={cn(
                              'cursor-pointer hover:bg-muted/50 animate-in fade-in duration-150',
                              isExpanded && 'border-b-0',
                            )}
                            onClick={() => toggleExpand(budget.id)}
                          >
                            {visibleColumns.includes('date') && (
                              <TableCell className="whitespace-nowrap">
                                {(() => {
                                  const { date, time } = formatDateParts(budget.date);
                                  return (
                                    <div className="flex flex-col leading-snug">
                                      <span className="text-sm text-foreground">{date}</span>
                                      <span className="text-xs text-muted-foreground">{time}</span>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                            )}
                            {showSeller && <TableCell className="font-medium">{budget.sellerName}</TableCell>}
                            {visibleColumns.includes('client') && (
                              <TableCell className="text-muted-foreground">
                                {budget.clientName ?? 'Sin registrar'}
                              </TableCell>
                            )}
                            {visibleColumns.includes('phone') && (
                              <TableCell className="text-muted-foreground">{budget.clientPhone ?? '-'}</TableCell>
                            )}
                            {visibleColumns.includes('items') && (
                              <TableCell className="text-center tabular-nums">{budget.itemCount}</TableCell>
                            )}
                            {visibleColumns.includes('total') && (
                              <TableCell className="text-right font-medium tabular-nums">
                                $ {formatPrice(budget.total)}
                              </TableCell>
                            )}
                            {visibleColumns.includes('validUntil') && (
                              <TableCell className="text-muted-foreground">
                                {budget.validUntil ? (
                                  <span className={cn(isExpired && 'text-destructive font-medium')}>
                                    {formatShortDate(budget.validUntil)}
                                    {isExpired && ' · Vencido'}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            )}
                            {visibleColumns.includes('status') && (
                              <TableCell>
                                <StatusBadge status={budget.status} />
                              </TableCell>
                            )}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <ActionMenu
                                items={[
                                  {
                                    label: 'Compartir por WhatsApp',
                                    icon: FileText,
                                    onClick: () => handleWhatsApp(budget),
                                  },
                                  budget.status === 'pending' && {
                                    label: 'Convertir a venta',
                                    icon: ShoppingCart,
                                    onClick: () => setConvertingBudgetId(budget.id),
                                  },
                                  canManage && budget.status === 'pending'
                                    ? {
                                        label: 'Editar',
                                        icon: Pencil,
                                        onClick: () => handleOpenEdit(budget.id),
                                      }
                                    : null,
                                  canManage
                                    ? {
                                        label: 'Eliminar',
                                        icon: Trash2,
                                        onClick: () => setDeleteConfirmId(budget.id),
                                        variant: 'destructive' as const,
                                      }
                                    : null,
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
                                  toggleExpand(budget.id);
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
                              <TableCell colSpan={totalCols} className="px-3 sm:px-6 pb-4 pt-0 bg-muted/30">
                                <div className="rounded-xl bg-background p-3 sm:p-4 shadow-sm space-y-2">
                                  {budget.items.map((item, i) => (
                                    <div
                                      key={i}
                                      className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_120px_120px] gap-1 sm:gap-3 sm:items-center rounded-lg border bg-card px-3 py-2.5 sm:px-4 sm:py-3 text-sm"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-medium truncate">{item.variantName}</p>
                                      </div>
                                      <div className="flex sm:block justify-between sm:text-center text-muted-foreground">
                                        <span className="sm:hidden text-xs">Cantidad: </span>
                                        <span className="tabular-nums">{item.quantity}</span>
                                      </div>
                                      <div className="flex sm:block justify-between sm:text-right text-muted-foreground">
                                        <span className="sm:hidden text-xs">Precio unit.: </span>
                                        <span className="tabular-nums">$ {formatPrice(item.unitPrice)}</span>
                                      </div>
                                      <div className="flex sm:block justify-between sm:text-right">
                                        <span className="sm:hidden text-xs text-muted-foreground">Subtotal: </span>
                                        <span className="tabular-nums font-medium">$ {formatPrice(item.subtotal)}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {budget.notes && (
                                    <div className="rounded-lg border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
                                      <p className="text-xs text-muted-foreground mb-0.5">Notas</p>
                                      <p className="text-sm">{budget.notes}</p>
                                    </div>
                                  )}
                                </div>
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

      <BudgetConvertDialog
        budgetId={convertingBudgetId ?? 0}
        isOpen={convertingBudgetId !== null}
        onClose={() => setConvertingBudgetId(null)}
      />

      <NewBudgetDialog
        key={dialogKey}
        isOpen={isNewDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleDialogSuccess}
        editBudgetId={editingBudgetId}
      />

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El presupuesto se eliminará permanentemente.
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

export const BudgetsSection = memo(BudgetsSectionComponent);
