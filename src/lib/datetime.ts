import { formatInTimeZone } from 'date-fns-tz';

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
