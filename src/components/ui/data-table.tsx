'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { memo, useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnHeaderFilter } from '@/components/ui/column-header-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortValue?: (item: T) => string | number | null | undefined;
  filterOptions?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  defaultItemsPerPage?: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  hasSelection?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const SKELETON_ROWS = 5;

function DataTableComponent<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No hay datos',
  defaultItemsPerPage = 10,
  onItemsPerPageChange,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  hasSelection = false,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultItemsPerPage);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleItemsPerPageChange = (n: number) => {
    setItemsPerPage(n);
    setPage(1);
    onItemsPerPageChange?.(n);
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    return [...data].sort((a, b) => {
      const va = col.sortValue!(a) ?? '';
      const vb = col.sortValue!(b) ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir, columns]);

  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageData = sortedData.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const pageKeys = pageData.map((item) => keyExtractor(item));
  const allPageSelected = selectable && pageKeys.length > 0 && pageKeys.every((k) => selectedKeys?.has(k));
  const somePageSelected = selectable && !allPageSelected && pageKeys.some((k) => selectedKeys?.has(k));

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (checked) {
      pageKeys.forEach((k) => next.add(k));
    } else {
      pageKeys.forEach((k) => next.delete(k));
    }
    onSelectionChange(next);
  };

  const handleSelectRow = (key: string | number, checked: boolean) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    onSelectionChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-card shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-6 px-2">
                  <Checkbox
                    checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                    onCheckedChange={(checked) => handleSelectAll(checked === true)}
                    aria-label="Seleccionar todos"
                    className={cn('transition-opacity duration-150', hasSelection ? 'opacity-100' : 'opacity-0')}
                  />
                </TableHead>
              )}
              {columns.map((column) => {
                if (column.filterOptions) {
                  return (
                    <ColumnHeaderFilter
                      key={column.key}
                      title={typeof column.header === 'string' ? column.header : column.key}
                      sortKey={column.key}
                      currentSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      filterOptions={column.filterOptions}
                      filterValue={column.filterValue ?? ''}
                      onFilterChange={
                        column.onFilterChange ??
                        (() => {
                          /* no-op */
                        })
                      }
                      className={column.className}
                    />
                  );
                }
                return (
                  <TableHead key={column.key} className={column.className}>
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={cn(
                          'flex items-center gap-1 hover:text-foreground transition-colors',
                          column.className?.includes('text-right') && 'w-full justify-end',
                        )}
                      >
                        {column.header}
                        {sortKey === column.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && (
                    <TableCell className="w-6 px-2">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={selectable ? columns.length + 1 : columns.length}>
                  <EmptyState icon={Inbox} title={emptyMessage} />
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((item) => {
                const itemKey = keyExtractor(item);
                const isSelected = selectable && (selectedKeys?.has(itemKey) ?? false);
                return (
                  <TableRow
                    key={itemKey}
                    data-selected={isSelected || undefined}
                    className={cn('group animate-in fade-in duration-150', isSelected && 'bg-muted/50')}
                  >
                    {selectable && (
                      <TableCell className="w-6 px-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectRow(itemKey, checked === true)}
                          aria-label="Seleccionar fila"
                          className={cn(
                            'transition-opacity duration-150',
                            hasSelection || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                          )}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={cn(column.className)}>
                        {column.cell(item)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {onItemsPerPageChange && (
            <>
              <span className="hidden sm:inline">Filas por página</span>
              <Select value={String(itemsPerPage)} onValueChange={(v) => handleItemsPerPageChange(Number(v))}>
                <SelectTrigger className="h-9 w-auto px-3">
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
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span>
            {totalItems === 0 ? (
              '0 resultados'
            ) : (
              <>
                <span className="sm:hidden">
                  {safePage}/{totalPages}
                </span>
                <span className="hidden sm:inline">
                  {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, totalItems)} de {totalItems}
                </span>
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => setPage((p) => p - 1)}
              disabled={safePage <= 1 || isLoading}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-9 w-9 p-0"
              onClick={() => setPage((p) => p + 1)}
              disabled={safePage >= totalPages || isLoading}
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DataTable = memo(DataTableComponent) as <T>(props: DataTableProps<T>) => React.JSX.Element;
