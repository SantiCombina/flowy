'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Filter } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface ColumnHeaderFilterProps {
  title: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  filterOptions: FilterOption[];
  filterValue: string;
  onFilterChange: (value: string) => void;
  className?: string;
}

export function ColumnHeaderFilter({
  title,
  sortKey,
  currentSortKey,
  sortDir,
  onSort,
  filterOptions,
  filterValue,
  onFilterChange,
  className,
}: ColumnHeaderFilterProps) {
  const isSorted = currentSortKey === sortKey;
  const hasFilter = !!filterValue;
  const isRightAligned = className?.includes('text-right');

  return (
    <TableHead className={className} aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className={cn('flex items-center gap-0.5', isRightAligned && 'flex-row-reverse justify-end')}>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={cn(
            'flex items-center gap-1 hover:text-foreground transition-colors',
            isRightAligned && 'justify-end',
          )}
        >
          {title}
          {isSorted ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
          )}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'relative flex items-center justify-center rounded-sm p-0.5 transition-colors',
                hasFilter
                  ? 'text-primary hover:text-primary/80'
                  : 'text-muted-foreground/70 hover:text-muted-foreground',
              )}
              aria-label={`Filtrar por ${title.toLowerCase()}`}
              data-active={hasFilter}
            >
              <Filter className="h-3.5 w-3.5" />
              {hasFilter && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1.5" align="start">
            <div className="space-y-0.5">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFilterChange(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors',
                    filterValue === option.value ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted',
                  )}
                >
                  {option.label}
                  {filterValue === option.value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={() => onFilterChange('')}
                className="mt-1 w-full rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
              >
                Limpiar filtro
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </TableHead>
  );
}
