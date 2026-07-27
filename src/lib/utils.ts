import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCurrency } from '@/lib/money';

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${format(d, 'dd/MM/yyyy')} · ${format(d, 'hh:mm a')}`;
}

export function formatDateParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: format(d, 'dd/MM/yyyy'),
    time: format(d, 'hh:mm a'),
  };
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy');
}
