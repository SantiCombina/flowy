'use client';

import { keepPreviousData } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import type { HistoryMovement, HistoryResult, MovementType } from '@/app/services/stock-movements';
import { getHistoryAction } from '@/components/history/actions';
import { MovementTypeBadge } from '@/components/history/movement-type-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ColumnHeaderDateFilter } from '@/components/ui/column-header-date-filter';
import { ColumnHeaderMultiFilter } from '@/components/ui/column-header-multi-filter';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/contexts/settings-context';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatDate, formatDateParts } from '@/lib/utils';

const ALL_TYPES: MovementType[] = [
  'entry',
  'exit',
  'adjustment',
  'sale',
  'dispatch_to_mobile',
  'return_from_mobile',
  'sale_cancelled',
  'sale_edit',
];

const TYPE_LABELS: Record<MovementType, string> = {
  entry: 'Ingreso',
  exit: 'Egreso',
  adjustment: 'Ajuste',
  sale: 'Venta',
  dispatch_to_mobile: 'Asignación',
  return_from_mobile: 'Devolución',
  sale_cancelled: 'Venta cancelada',
  sale_edit: 'Edición venta',
};

type SortKey = 'createdAt' | 'type' | 'productName' | 'quantity';

type StockImpact = 'positive' | 'negative' | 'neutral';

function getStockImpact(movement: HistoryMovement): StockImpact {
  switch (movement.type) {
    case 'entry':
    case 'sale_cancelled':
      return 'positive';
    case 'exit':
    case 'sale':
      return 'negative';
    case 'dispatch_to_mobile':
    case 'return_from_mobile':
      return 'neutral';
    case 'adjustment':
    case 'sale_edit':
      return movement.quantity > 0 ? 'positive' : movement.quantity < 0 ? 'negative' : 'neutral';
  }
}

function getQuantityDisplay(movement: HistoryMovement, impact: StockImpact): string {
  const q = Math.abs(movement.quantity);
  if (impact === 'neutral') return String(q);
  if (impact === 'positive') return `+${q}`;
  return `-${q}`;
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

interface HistorySectionProps {
  initialData: { success: true } & HistoryResult;
}

export function HistorySection({ initialData }: HistorySectionProps) {
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('history');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData.docs.length > 0) {
      queryClient.setQueryData(['history'], initialData);
    }
  }, [queryClient, initialData]);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);
  const [selectedTypes, setSelectedTypes] = useState<MovementType[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePersistedLimit('flowy:history:limit', 25);

  const [sortKey, setSortKey] = useState<SortKey | null>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isPending } = useServerActionQuery({
    queryKey: queryKeys.history.filtered(dateRange, selectedTypes),
    queryFn: () =>
      getHistoryAction({
        ...(dateRange ? { from: dateRange.from.toISOString(), to: dateRange.to.toISOString() } : {}),
        ...(selectedTypes.length > 0 ? { types: selectedTypes } : {}),
        limit: 500,
      }),
    initialData: !dateRange && selectedTypes.length === 0 ? initialData : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const docs = data?.docs ?? [];
  const totalDocs = data?.totalDocs ?? 0;

  function handleDateRangeChange(range: { from: Date; to: Date } | undefined) {
    setDateRange(range);
    setPage(1);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedDocs = [...docs].sort((a, b) => {
    if (!sortKey) return 0;
    let va: string | number = '';
    let vb: string | number = '';
    if (sortKey === 'createdAt') {
      va = a.createdAt;
      vb = b.createdAt;
    } else if (sortKey === 'type') {
      va = TYPE_LABELS[a.type];
      vb = TYPE_LABELS[b.type];
    } else if (sortKey === 'productName') {
      va = a.productName;
      vb = b.productName;
    } else if (sortKey === 'quantity') {
      va = Math.abs(a.quantity);
      vb = Math.abs(b.quantity);
    }
    if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
    const sa = String(va).toLowerCase();
    const sb = String(vb).toLowerCase();
    if (sa < sb) return sortDir === 'asc' ? -1 : 1;
    if (sa > sb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(totalDocs / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedDocs = sortedDocs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const showReference = visibleColumns.includes('reference');
  const showReason = visibleColumns.includes('reason');

  const sortableHead = (key: SortKey, label: string, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon column={key} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </TableHead>
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Historial"
        description="Registro de movimientos de inventario"
        actions={<ColumnVisibilityDropdown tableName="history" />}
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="space-y-3">
          <div
            className={cn(
              'rounded-xl bg-card shadow-sm overflow-hidden border border-border/40 transition-opacity duration-150',
              isPending && 'opacity-50 pointer-events-none',
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('date') && (
                    <ColumnHeaderDateFilter
                      title="Fecha"
                      sortKey="createdAt"
                      currentSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={(key) => handleSort(key as SortKey)}
                      value={dateRange}
                      onChange={handleDateRangeChange}
                      className="w-px"
                    />
                  )}
                  {visibleColumns.includes('type') && (
                    <ColumnHeaderMultiFilter
                      title="Tipo"
                      sortKey="type"
                      currentSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={(key) => handleSort(key as SortKey)}
                      filterOptions={ALL_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))}
                      filterValue={selectedTypes}
                      onFilterChange={(types) => {
                        const movementTypes = types as MovementType[];
                        setSelectedTypes(movementTypes);
                        setPage(1);
                      }}
                      className="w-px"
                    />
                  )}
                  {visibleColumns.includes('product') && sortableHead('productName', 'Producto')}
                  {visibleColumns.includes('quantity') && sortableHead('quantity', 'Cantidad', 'w-px text-right')}
                  <TableHead className="w-px text-center">Stock</TableHead>
                  {showReference && <TableHead className="w-px">Referencia</TableHead>}
                  {showReason && <TableHead>Razón</TableHead>}
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      No hay movimientos en el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDocs.map((movement: HistoryMovement) => {
                    const isExpanded = expandedId === movement.id;
                    const impact = getStockImpact(movement);
                    return (
                      <Fragment key={movement.id}>
                        <TableRow
                          className={cn('cursor-pointer', isExpanded && 'border-b-0')}
                          onClick={() => setExpandedId((prev) => (prev === movement.id ? null : movement.id))}
                        >
                          {visibleColumns.includes('date') && (
                            <TableCell className="whitespace-nowrap">
                              {(() => {
                                const { date, time } = formatDateParts(movement.createdAt);
                                return (
                                  <div className="flex flex-col leading-snug">
                                    <span className="text-sm text-foreground">{date}</span>
                                    <span className="text-xs text-muted-foreground">{time}</span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                          )}
                          {visibleColumns.includes('type') && (
                            <TableCell>
                              <MovementTypeBadge type={movement.type} />
                            </TableCell>
                          )}
                          {visibleColumns.includes('product') && (
                            <TableCell>
                              <span className="font-medium">{movement.productName}</span>
                              {movement.variantCode && (
                                <span className="ml-1.5 text-xs text-muted-foreground">{movement.variantCode}</span>
                              )}
                            </TableCell>
                          )}
                          {visibleColumns.includes('quantity') && (
                            <TableCell className="text-right tabular-nums">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 font-medium',
                                  impact === 'positive' && 'text-success-muted-foreground',
                                  impact === 'negative' && 'text-error-muted-foreground',
                                  impact === 'neutral' && 'text-muted-foreground',
                                )}
                              >
                                {impact === 'positive' && <TrendingUp className="h-3.5 w-3.5" />}
                                {impact === 'negative' && <TrendingDown className="h-3.5 w-3.5" />}
                                {impact === 'neutral' && <ArrowRight className="h-3.5 w-3.5" />}
                                {getQuantityDisplay(movement, impact)}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-center tabular-nums text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {movement.previousStock}
                              <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                              {movement.newStock}
                            </span>
                          </TableCell>
                          {showReference && (
                            <TableCell className="text-sm text-muted-foreground">
                              {movement.sellerName ?? '—'}
                            </TableCell>
                          )}
                          {showReason && (
                            <TableCell className="max-w-50">
                              {movement.reason ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate text-sm text-muted-foreground cursor-default">
                                      {movement.reason}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {movement.reason}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground/50">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right pr-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId((prev) => (prev === movement.id ? null : movement.id));
                              }}
                            >
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                  isExpanded && 'rotate-180',
                                )}
                              />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={10} className="px-6 pb-4 pt-0 bg-muted/30">
                              <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-2 text-sm sm:grid-cols-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Stock anterior</p>
                                  <p className="font-medium tabular-nums">{movement.previousStock}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Stock nuevo</p>
                                  <p className="font-medium tabular-nums">{movement.newStock}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Registrado por</p>
                                  <p className="font-medium">{movement.createdByName}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Fecha y hora</p>
                                  <p className="font-medium">{formatDate(movement.createdAt)}</p>
                                </div>
                                {movement.reason && (
                                  <div className="col-span-2 sm:col-span-4">
                                    <p className="text-xs text-muted-foreground">Razón / Observaciones</p>
                                    <p className="font-medium">{movement.reason}</p>
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
                {totalDocs === 0
                  ? '0 resultados'
                  : `${(safePage - 1) * itemsPerPage + 1}–${Math.min(safePage * itemsPerPage, totalDocs)} de ${totalDocs}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={safePage <= 1 || isPending}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={safePage >= totalPages || isPending}
                >
                  ›
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
