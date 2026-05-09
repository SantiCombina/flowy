'use client';

import { endOfDay, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateRangeFilterContentProps {
  value: DateRangeValue | undefined;
  onChange: (range: DateRangeValue | undefined) => void;
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

export function DateRangeFilterContent({ value, onChange }: DateRangeFilterContentProps) {
  const isMobile = useIsMobile();
  const [selectingFrom, setSelectingFrom] = useState<Date | undefined>();
  const [hoveredDay, setHoveredDay] = useState<Date | undefined>();
  const lastHoveredIso = useRef<string | null>(null);

  const calendarSelected: DateRange | undefined = (() => {
    if (!selectingFrom) return value ? { from: value.from, to: value.to } : undefined;
    if (hoveredDay) {
      const start = selectingFrom <= hoveredDay ? selectingFrom : hoveredDay;
      const end = selectingFrom <= hoveredDay ? hoveredDay : selectingFrom;
      return { from: start, to: end };
    }
    return { from: selectingFrom, to: undefined };
  })();

  function handleDayClick(day: Date) {
    if (!selectingFrom) {
      setSelectingFrom(day);
      setHoveredDay(undefined);
      lastHoveredIso.current = null;
    } else {
      const start = selectingFrom <= day ? selectingFrom : day;
      const end = selectingFrom <= day ? day : selectingFrom;
      setSelectingFrom(undefined);
      setHoveredDay(undefined);
      lastHoveredIso.current = null;
      onChange({ from: start, to: end });
    }
  }

  function handlePreset(getRange: () => DateRangeValue) {
    const range = getRange();
    setSelectingFrom(undefined);
    setHoveredDay(undefined);
    lastHoveredIso.current = null;
    onChange(range);
  }

  const calendarContent = (
    <div
      className="w-full"
      onMouseMove={
        isMobile
          ? undefined
          : (e) => {
              if (!selectingFrom) return;
              const target = (e.target as HTMLElement).closest('[data-date]');
              const iso = target?.getAttribute('data-date') ?? null;
              if (iso === lastHoveredIso.current) return;
              lastHoveredIso.current = iso;
              setHoveredDay(iso ? new Date(iso) : undefined);
            }
      }
      onMouseLeave={
        isMobile
          ? undefined
          : () => {
              lastHoveredIso.current = null;
              setHoveredDay(undefined);
            }
      }
    >
      <Calendar
        mode="range"
        selected={calendarSelected}
        onSelect={() => undefined}
        onDayClick={handleDayClick}
        className={isMobile ? 'w-full !p-0 !px-4' : undefined}
        numberOfMonths={isMobile ? 1 : 2}
        locale={es}
        fixedWeeks
        showOutsideDays={false}
        disabled={{ after: new Date() }}
        defaultMonth={value?.from ?? subDays(new Date(), 29)}
        classNames={{
          months: 'relative flex flex-col gap-0 md:flex-row',
          month: isMobile
            ? 'flex w-full flex-col gap-4'
            : 'flex w-full flex-col gap-4 px-3 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-border/50',
        }}
        formatters={{
          formatCaption: (date, options) => {
            const str = format(date, 'LLLL yyyy', { locale: options?.locale });
            return str.charAt(0).toUpperCase() + str.slice(1);
          },
          formatWeekdayName: (date) => format(date, 'EEEEE', { locale: es }).toUpperCase(),
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className={cn('flex', isMobile ? 'flex-col' : 'flex-row')}>
        <div className={cn('flex flex-col border-r py-3', isMobile && 'border-r-0 border-b py-2 px-4')}>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset.getRange)}
              className={cn(
                'px-4 py-1.5 text-sm text-left hover:bg-accent transition-colors whitespace-nowrap',
                isMobile && 'px-0 py-1',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {calendarContent}
      </div>
      {value && (
        <div className="border-t p-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            Limpiar filtro
          </Button>
        </div>
      )}
    </div>
  );
}
