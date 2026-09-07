import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCurrency } from '@/lib/money';

export { formatDate, formatDateParts, formatShortDate } from '@/lib/datetime';
