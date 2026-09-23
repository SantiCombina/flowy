import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const DEFAULT_TENANT_TZ = 'America/Argentina/Buenos_Aires';
export const DEFAULT_LOCALE = 'es-AR';

export function formatDate(iso: string, tz: string = DEFAULT_TENANT_TZ): string {
  const d = new Date(iso);
  return `${formatInTimeZone(d, tz, 'dd/MM/yyyy')} · ${formatInTimeZone(d, tz, 'hh:mm a')}`;
}

export function formatDateParts(iso: string, tz: string = DEFAULT_TENANT_TZ): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: formatInTimeZone(d, tz, 'dd/MM/yyyy'),
    time: formatInTimeZone(d, tz, 'hh:mm a'),
  };
}

export function formatShortDate(iso: string, tz: string = DEFAULT_TENANT_TZ): string {
  return formatInTimeZone(new Date(iso), tz, 'dd/MM/yyyy');
}

function toInstant(value: string | Date): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Expected an instant, received a civil date key');
  }
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid instant');
  }
  return d;
}

export function toDateKeyInTz(instant: string | Date, tz: string): string {
  return formatInTimeZone(toInstant(instant), tz, 'yyyy-MM-dd');
}

export function toMonthKeyInTz(instant: string | Date, tz: string): string {
  return formatInTimeZone(toInstant(instant), tz, 'yyyy-MM');
}

export function dayKeyToStartInstant(dayKey: string, tz: string): string {
  return fromZonedTime(`${dayKey}T00:00:00`, tz).toISOString();
}

export function shiftDateKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * 86_400_000).toISOString().slice(0, 10);
}

export function shiftMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const total = year * 12 + (month - 1) + months;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function monthStartInstantInTz(instant: string | Date, tz: string, monthOffset = 0): string {
  const monthKey = shiftMonthKey(toMonthKeyInTz(instant, tz), monthOffset);
  return dayKeyToStartInstant(`${monthKey}-01`, tz);
}

export function currentCivilMonth(tz: string): { year: number; month: number } {
  const key = toMonthKeyInTz(new Date(), tz);
  const [year, month] = key.split('-');
  return { year: Number(year), month: Number(month) };
}

export type Period = 'day' | 'week' | 'month' | 'year';

export interface PeriodRanges {
  currentStart: string;
  prevStart: string;
  prevEnd: string;
  chartStart: string;
}

export function getPeriodRangesInTz(now: string | Date, tz: string, period: Period): PeriodRanges {
  const todayKey = toDateKeyInTz(now, tz);
  const monthKey = toMonthKeyInTz(now, tz);
  const yearKey = monthKey.slice(0, 4);

  switch (period) {
    case 'day': {
      const currentStart = dayKeyToStartInstant(todayKey, tz);
      const prevStart = dayKeyToStartInstant(shiftDateKey(todayKey, -1), tz);
      const prevEnd = new Date(new Date(currentStart).getTime() - 1).toISOString();
      const chartStart = dayKeyToStartInstant(shiftDateKey(todayKey, -7), tz);
      return { currentStart, prevStart, prevEnd, chartStart };
    }
    case 'week': {
      const isoDow = Number(formatInTimeZone(toInstant(now), tz, 'i'));
      const mondayKey = shiftDateKey(todayKey, 1 - isoDow);
      const currentStart = dayKeyToStartInstant(mondayKey, tz);
      const prevStart = dayKeyToStartInstant(shiftDateKey(mondayKey, -7), tz);
      const prevEnd = new Date(new Date(currentStart).getTime() - 1).toISOString();
      const chartStart = dayKeyToStartInstant(shiftDateKey(todayKey, -7), tz);
      return { currentStart, prevStart, prevEnd, chartStart };
    }
    case 'month': {
      const currentStart = dayKeyToStartInstant(`${monthKey}-01`, tz);
      const prevStart = dayKeyToStartInstant(`${shiftMonthKey(monthKey, -1)}-01`, tz);
      const prevEnd = new Date(new Date(currentStart).getTime() - 1).toISOString();
      const chartStart = dayKeyToStartInstant(shiftDateKey(todayKey, -30), tz);
      return { currentStart, prevStart, prevEnd, chartStart };
    }
    case 'year': {
      const currentStart = dayKeyToStartInstant(`${yearKey}-01-01`, tz);
      const prevStart = dayKeyToStartInstant(`${Number(yearKey) - 1}-01-01`, tz);
      const prevEnd = new Date(new Date(currentStart).getTime() - 1).toISOString();
      return { currentStart, prevStart, prevEnd, chartStart: currentStart };
    }
  }
}

export function monthRangeInTz(year: number, month: number, tz: string): { from: string; to: string } {
  const monthKey = shiftMonthKey(`${year}-${String(month).padStart(2, '0')}`, 0);
  const from = dayKeyToStartInstant(`${monthKey}-01`, tz);
  const to = dayKeyToStartInstant(`${shiftMonthKey(monthKey, 1)}-01`, tz);
  return { from, to };
}
