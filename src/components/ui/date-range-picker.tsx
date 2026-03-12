'use client';

import { endOfDay, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, X } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRangeValue | undefined;
  onChange: (range: DateRangeValue | undefined) => void;
  placeholder?: string;
  className?: string;
}

function formatRange(range: DateRangeValue): string {
  const fmt = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${fmt(range.from)} — ${fmt(range.to)}`;
}

const today = () => new Date();

const PRESETS = [
  { label: 'Hoy', getRange: () => ({ from: today(), to: today() }) },
  { label: 'Ayer', getRange: () => ({ from: subDays(today(), 1), to: subDays(today(), 1) }) },
  {
    label: 'Esta semana',
    getRange: () => ({ from: startOfWeek(today(), { weekStartsOn: 1 }), to: endOfWeek(today(), { weekStartsOn: 1 }) }),
  },
  {
    label: 'Semana pasada',
    getRange: () => {
      const start = startOfWeek(subDays(today(), 7), { weekStartsOn: 1 });
      return { from: start, to: endOfWeek(start, { weekStartsOn: 1 }) };
    },
  },
  { label: 'Últimos 7 días', getRange: () => ({ from: subDays(today(), 6), to: today() }) },
  { label: 'Últimos 30 días', getRange: () => ({ from: subDays(today(), 29), to: today() }) },
  { label: 'Este mes', getRange: () => ({ from: startOfMonth(today()), to: endOfMonth(today()) }) },
  {
    label: 'Mes anterior',
    getRange: () => {
      const prev = subMonths(today(), 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    },
  },
  { label: 'Últimos 3 meses', getRange: () => ({ from: startOfMonth(subMonths(today(), 2)), to: endOfDay(today()) }) },
];

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Seleccionar período',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value ? { from: value.from, to: value.to } : undefined);

  function handleOpenChange(next: boolean) {
    if (next) setDraft(value ? { from: value.from, to: value.to } : undefined);
    setOpen(next);
  }

  function handleSelect(range: DateRange | undefined) {
    setDraft(range);
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    }
  }

  function handlePreset(getRange: () => DateRangeValue) {
    const range = getRange();
    setDraft({ from: range.from, to: range.to });
    onChange(range);
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(undefined);
    setDraft(undefined);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-9 justify-start gap-2 px-3 text-sm font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{value ? formatRange(value) : placeholder}</span>
          {value && (
            <X
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col border-r py-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset.getRange)}
                className="px-4 py-1.5 text-sm text-left hover:bg-accent transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <Calendar
            mode="range"
            selected={draft}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={es}
            fixedWeeks
            disabled={{ after: new Date() }}
            defaultMonth={value?.from ?? subDays(new Date(), 29)}
            formatters={{
              formatCaption: (date, options) => {
                const str = format(date, 'LLLL yyyy', { locale: options?.locale });
                return str.charAt(0).toUpperCase() + str.slice(1);
              },
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
