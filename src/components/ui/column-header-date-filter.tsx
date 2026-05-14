'use client';

import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays } from 'lucide-react';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { TableHead } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { DateRangeFilterContent, type DateRangeValue } from './date-range-filter';

interface ColumnHeaderDateFilterProps {
  title: string;
  sortKey: string;
  currentSortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
  value: DateRangeValue | undefined;
  onChange: (range: DateRangeValue | undefined) => void;
  className?: string;
}

function formatRangeLabel(range: DateRangeValue): string {
  const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

export function ColumnHeaderDateFilter({
  title,
  sortKey,
  currentSortKey,
  sortDir,
  onSort,
  value,
  onChange,
  className,
}: ColumnHeaderDateFilterProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const isSorted = currentSortKey === sortKey;
  const hasFilter = !!value;

  const handleChange = (range: DateRangeValue | undefined) => {
    onChange(range);
    if (!range) {
      setOpen(false);
    }
  };

  const triggerButton = (onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center rounded-sm p-0.5 transition-colors',
        hasFilter ? 'text-primary hover:text-primary/80' : 'text-muted-foreground/70 hover:text-muted-foreground',
      )}
      aria-label={`Filtrar por ${title.toLowerCase()}`}
      data-active={hasFilter}
    >
      <CalendarDays className="h-3.5 w-3.5" />
      {hasFilter && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
    </button>
  );

  const content = <DateRangeFilterContent value={value} onChange={handleChange} />;

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
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
          )}
        </button>

        {isMobile ? (
          <>
            {triggerButton(() => setOpen(true))}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetContent
                side="bottom"
                className="rounded-t-xl p-0 gap-0 max-h-[90svh] overflow-y-auto"
                showCloseButton={false}
              >
                <SheetTitle className="sr-only">Filtrar por fecha</SheetTitle>
                <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted" />
                <div className="px-4 pt-1 pb-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Filtrar por fecha
                  </p>
                </div>
                {content}
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{triggerButton()}</PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {content}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {hasFilter && (
        <div className="mt-0.5 text-[10px] font-medium text-primary truncate max-w-[120px]">
          {formatRangeLabel(value)}
        </div>
      )}
    </TableHead>
  );
}
