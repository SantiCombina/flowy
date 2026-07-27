export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function addMoney(a: number, b: number): number {
  return roundMoney(a + b);
}

export function subtractMoney(a: number, b: number): number {
  return roundMoney(a - b);
}

export function multiplyMoney(a: number, b: number): number {
  return roundMoney(a * b);
}

export function calculatePrice(costPrice: number, marginPercent: number): number {
  return roundMoney(costPrice * (1 + marginPercent / 100));
}

export function calculateCommission(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

export function moneyEquals(a: number, b: number, options?: { tolerance?: number }): boolean {
  const tolerance = options?.tolerance ?? 0.1;
  return Math.abs(a - b) <= tolerance;
}

export function formatCurrency(value: number): string {
  const rounded = roundMoney(value);
  const hasCents = rounded % 1 !== 0;

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rounded);
}
