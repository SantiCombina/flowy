import { calculateCommission as calc } from '@/lib/money';

export function calculateCommission(amountPaid: number): number {
  return Math.max(0, calc(amountPaid, 3));
}
