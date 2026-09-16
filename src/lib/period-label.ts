import type { Period } from '@/app/services/dashboard';

const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long' });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function startOfWeek(date: Date): Date {
  const dow = date.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export function getPeriodLabel(period: Period, now: Date = new Date()): string {
  const day = now.getDate();
  const monthName = monthFormatter.format(now);
  const year = now.getFullYear();

  switch (period) {
    case 'day':
      return `Hoy, ${day} de ${monthName}`;
    case 'week': {
      const start = startOfWeek(now);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const startMonth = monthFormatter.format(start);
      const endMonth = monthFormatter.format(end);
      if (startMonth === endMonth) {
        return `Semana del ${start.getDate()} al ${end.getDate()} de ${startMonth}`;
      }
      return `Semana del ${start.getDate()} de ${startMonth} al ${end.getDate()} de ${endMonth}`;
    }
    case 'month':
      return `${capitalize(monthName)} de ${year}`;
    case 'year':
      return String(year);
  }
}
