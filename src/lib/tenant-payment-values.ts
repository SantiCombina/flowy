export const MAX_TENANT_PAYMENT_AMOUNT = 999999999.99;

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 0.0001;
}

export function formatPaymentDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC' }).format(new Date(value));
}

export function todayInArgentina(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function getDefaultTenantPaymentPeriod(controlDate: string | null) {
  const periodStart = controlDate?.slice(0, 10) ?? todayInArgentina();
  const endDate = new Date(`${periodStart}T12:00:00.000Z`);
  const startDay = endDate.getUTCDate();
  endDate.setUTCDate(1);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const lastDayOfMonth = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0, 12)).getUTCDate();
  endDate.setUTCDate(Math.min(startDay, lastDayOfMonth));
  return { periodStart, periodEnd: endDate.toISOString().slice(0, 10) };
}
