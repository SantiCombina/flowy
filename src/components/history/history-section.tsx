'use client';

import { subDays } from 'date-fns';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  Filter,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState, useTransition } from 'react';

import { getHistoryMovements } from '@/app/services/stock-movements';
import type { HistoryMovement, HistoryResult, MovementType } from '@/app/services/stock-movements';
import { MovementTypeBadge } from '@/components/history/movement-type-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSettings } from '@/contexts/settings-context';
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { cn } from '@/lib/utils';

const DEFAULT_DATE_RANGE = {
  from: subDays(new Date(), 29),
  to: new Date(),
};

const ALL_TYPES: MovementType[] = ['entry', 'exit', 'adjustment', 'sale', 'dispatch_to_mobile', 'return_from_mobile'];

const TYPE_LABELS: Record<MovementType, string> = {
  entry: 'Ingreso',
  exit: 'Egreso',
  adjustment: 'Ajuste',
  sale: 'Venta',
  dispatch_to_mobile: 'Asignación',
  return_from_mobile: 'Devolución',
};

type SortKey = 'createdAt' | 'type' | 'productName' | 'quantity';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type StockImpact = 'positive' | 'negative' | 'neutral';

function getStockImpact(movement: HistoryMovement): StockImpact {
  switch (movement.type) {
    case 'entry':
      return 'positive';
    case 'exit':
    case 'sale':
      return 'negative';
    case 'dispatch_to_mobile':
    case 'return_from_mobile':
      return 'neutral';
    case 'adjustment':
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
  initialData: HistoryResult;
  ownerId: number;
}

export function HistorySection({ initialData, ownerId }: HistorySectionProps) {
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('history');

  const [data, setData] = useState<HistoryResult>(initialData);
  const [isPending, startTransition] = useTransition();
  const isFirstMount = useRef(true);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(DEFAULT_DATE_RANGE);
  const [selectedTypes, setSelectedTypes] = useState<MovementType[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [sortKey, setSortKey] = useState<SortKey | null>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function fetchData(filters: { dateRange: { from: Date; to: Date }; types: MovementType[] }) {
    startTransition(async () => {
      setPage(1);
      const result = await getHistoryMovements(ownerId, {
        from: filters.dateRange.from,
        to: filters.dateRange.to,
        types: filters.types.length > 0 ? filters.types : undefined,
        limit: 500,
      });
      setData(result);
    });
  }

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchData({ dateRange, types: selectedTypes });
  }, [dateRange, selectedTypes]);

  function handleDateRangeChange(range: { from: Date; to: Date } | undefined) {
    setDateRange(range ?? DEFAULT_DATE_RANGE);
    setPage(1);
  }

  function toggleType(type: MovementType) {
    setSelectedTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
    setPage(1);
  }

  function clearFilters() {
    setDateRange(DEFAULT_DATE_RANGE);
    setSelectedTypes([]);
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

  const sortedDocs = [...data.docs].sort((a, b) => {
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

  const totalDocs = sortedDocs.length;
  const totalPages = Math.max(1, Math.ceil(totalDocs / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedDocs = sortedDocs.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const hasActiveFilters = selectedTypes.length > 0;
  const isDefaultRange =
    dateRange.from.toDateString() === DEFAULT_DATE_RANGE.from.toDateString() &&
    dateRange.to.toDateString() === DEFAULT_DATE_RANGE.to.toDateString();

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
      <PageHeader title="Historial" description="Registro de movimientos de inventario" />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Filter className="h-4 w-4" />
                Tipo
                {selectedTypes.length > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {selectedTypes.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {ALL_TYPES.map((type) => (
                <DropdownMenuItem key={type} onClick={() => toggleType(type)}>
                  {TYPE_LABELS[type]}
                  {selectedTypes.includes(type) && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(hasActiveFilters || !isDefaultRange) && (
            <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground" onClick={clearFilters}>
              <X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          )}

          <div className="ml-auto">
            <ColumnVisibilityDropdown tableName="history" />
          </div>
        </div>

        <div className="space-y-3">
          <div
            className={cn(
              'rounded-md border bg-card shadow-sm transition-opacity duration-150',
              isPending && 'opacity-50 pointer-events-none',
            )}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('date') && sortableHead('createdAt', 'Fecha', 'w-40')}
                  {visibleColumns.includes('type') && sortableHead('type', 'Tipo', 'w-32')}
                  {visibleColumns.includes('product') && sortableHead('productName', 'Producto')}
                  {visibleColumns.includes('quantity') && sortableHead('quantity', 'Cantidad', 'w-28 text-right')}
                  <TableHead className="w-28 text-center">Stock</TableHead>
                  {showReference && <TableHead className="w-36">Referencia</TableHead>}
                  {showReason && <TableHead>Razón</TableHead>}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocs.length === 0 ? (
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
                            <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                              {formatDate(movement.createdAt)}
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
                                  impact === 'positive' && 'text-emerald-600',
                                  impact === 'negative' && 'text-red-600',
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
                            {movement.previousStock} → {movement.newStock}
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
                              className="h-7 w-7"
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
                <SelectTrigger className="h-8 w-17.5">
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
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={safePage <= 1 || isPending}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
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
