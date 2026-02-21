'use client';

import { type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems: number;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const SKELETON_ROWS = 5;

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No hay datos',
  page,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
}: DataTableProps<T>) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow key={keyExtractor(item)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(column.className)}>
                      {column.cell(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          {onItemsPerPageChange && (
            <>
              <span>Filas por página</span>
              <Select value={String(itemsPerPage)} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
                <SelectTrigger className="h-8 w-17.5 bg-white">
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

        <div className="flex items-center gap-3">
          <span>
            {totalItems === 0
              ? '0 resultados'
              : `${(page - 1) * itemsPerPage + 1}–${Math.min(page * itemsPerPage, totalItems)} de ${totalItems}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-white"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-white"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              ›
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
