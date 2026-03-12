'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

import type { SaleRow } from '@/app/services/sales';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/contexts/settings-context';
import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';
import { cn } from '@/lib/utils';

interface SalesSectionProps {
  sales: SaleRow[];
  showSellerColumn: boolean;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
};

const OPTIONAL_COLUMN_KEYS = ['date', 'seller', 'client', 'items', 'total', 'paymentMethod'] as const;

type SortKey = 'date' | 'seller' | 'client' | 'items' | 'total' | 'paymentMethod';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getSortValue(sale: SaleRow, key: SortKey): string | number {
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
      return PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod;
  }
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

export function SalesSection({ sales, showSellerColumn }: SalesSectionProps) {
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('sales');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
    if (!sortKey) return sales;
    return [...sales].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [sales, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedSales.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedSales = sortedSales.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const showSeller = showSellerColumn && visibleColumns.includes('seller');
  const visibleOptionalCount = OPTIONAL_COLUMN_KEYS.filter((k) => {
    if (k === 'seller') return showSeller;
    return visibleColumns.includes(k);
  }).length;
  const totalCols = visibleOptionalCount + 1;

  const sortableHead = (key: SortKey, label: string, className?: string) => (
    <TableHead className={className}>
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
      <PageHeader title="Ventas" description="Registro y seguimiento de ventas" />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex items-center justify-end gap-2">
          <ColumnVisibilityDropdown tableName="sales" excludeColumns={showSellerColumn ? [] : ['seller']} />
        </div>

        <div className="space-y-3">
          <div className="rounded-md border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('date') && sortableHead('date', 'Fecha', 'w-40')}
                  {showSeller && sortableHead('seller', 'Vendedor')}
                  {visibleColumns.includes('client') && sortableHead('client', 'Cliente')}
                  {visibleColumns.includes('items') && sortableHead('items', 'Ítems', 'w-20 text-center')}
                  {visibleColumns.includes('total') && sortableHead('total', 'Total', 'w-36 text-right')}
                  {visibleColumns.includes('paymentMethod') && sortableHead('paymentMethod', 'Pago', 'w-32')}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={totalCols} className="py-10 text-center text-muted-foreground">
                      No hay ventas registradas todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale) => {
                    const isExpanded = expandedId === sale.id;
                    return (
                      <Fragment key={sale.id}>
                        <TableRow
                          className={cn('cursor-pointer', isExpanded && 'border-b-0')}
                          onClick={() => toggleExpand(sale.id)}
                        >
                          {visibleColumns.includes('date') && (
                            <TableCell className="text-muted-foreground whitespace-nowrap">
                              {formatDate(sale.date)}
                            </TableCell>
                          )}
                          {showSeller && <TableCell className="font-medium">{sale.sellerName}</TableCell>}
                          {visibleColumns.includes('client') && (
                            <TableCell className="text-muted-foreground">{sale.clientName ?? '—'}</TableCell>
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
                              {PAYMENT_METHOD_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                            </TableCell>
                          )}
                          <TableCell className="text-right pr-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
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
                {sortedSales.length === 0
                  ? '0 resultados'
                  : `${(safePage - 1) * itemsPerPage + 1}–${Math.min(safePage * itemsPerPage, sortedSales.length)} de ${sortedSales.length}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={safePage <= 1}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={safePage >= totalPages}
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
