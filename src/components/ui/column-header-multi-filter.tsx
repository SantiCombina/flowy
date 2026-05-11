'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, Check, Filter } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface ColumnHeaderMultiFilterProps {
  title: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  filterOptions: FilterOption[];
  filterValue: string[];
  onFilterChange: (value: string[]) => void;
  className?: string;
}

export function ColumnHeaderMultiFilter({
  title,
  sortKey,
  currentSortKey,
  sortDir,
  onSort,
  filterOptions,
  filterValue,
  onFilterChange,
  className,
}: ColumnHeaderMultiFilterProps) {
  const isSorted = currentSortKey === sortKey;
  const hasFilter = filterValue.length > 0;
  const selectedCount = filterValue.length;

  const toggleValue = (value: string) => {
    if (filterValue.includes(value)) {
      onFilterChange(filterValue.filter((v) => v !== value));
    } else {
      onFilterChange([...filterValue, value]);
    }
  };

  return (
    <TableHead className={className} aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {title}
          {isSorted ? (
            sortDir === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
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
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
              )}
              aria-label={`Filtrar por ${title.toLowerCase()}`}
              aria-pressed={hasFilter}
            >
              <Filter className="h-3.5 w-3.5" />
              {hasFilter && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[8px] font-bold text-primary-foreground">
                  {selectedCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1.5" align="start">
            <div className="space-y-0.5">
              {filterOptions.map((option) => {
                const isSelected = filterValue.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleValue(option.value)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                      isSelected ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={() => onFilterChange([])}
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
