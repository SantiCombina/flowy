export function calculateCommission(amountPaid: number): number {
  return Math.max(0, Math.round(amountPaid * 0.03 * 100) / 100);
}
