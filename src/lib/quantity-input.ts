export function getQuantityInputValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  return String(value);
}

export function parseQuantityInputValue(value: string): number {
  if (value.trim() === '') return Number.NaN;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number.NaN;

  return Math.trunc(parsed);
}

export function clampQuantityInputValue(value: number, max?: number, min = 1): number {
  const minimum = Math.max(1, Math.trunc(min));
  const maximum = max === undefined ? undefined : Math.max(minimum, Math.trunc(max));
  const parsedValue = Number.isFinite(value) ? Math.trunc(value) : minimum;
  const minClamped = Math.max(minimum, parsedValue);

  if (maximum === undefined) return minClamped;

  return Math.min(minClamped, maximum);
}

export function commitQuantityInputValue(value: string, max?: number, min = 1): number {
  return clampQuantityInputValue(parseQuantityInputValue(value), max, min);
}
