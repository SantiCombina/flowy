const VALID_LIMITS = [25, 50, 100] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const SORT_VALUES = new Set<string>(['date', 'seller', 'client', 'items', 'total', 'status']);
const SORT_DIR_VALUES = new Set<string>(['asc', 'desc']);
const STATUS_VALUES = new Set<string>(['pending', 'approved', 'rejected', 'converted']);

export function parsePage(value: string | null): number {
  const parsed = parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function parseLimit(value: string | null): 25 | 50 | 100 {
  const parsed = parseInt(value ?? '25', 10);
  return VALID_LIMITS.includes(parsed as 25 | 50 | 100) ? (parsed as 25 | 50 | 100) : 25;
}

export function parseOptionalDate(value: string | null): string | undefined {
  return value && DATE_REGEX.test(value) ? value : undefined;
}

export function parseEnum<T extends string>(value: string | null, valid: Set<string>): T | undefined {
  return value && valid.has(value) ? (value as T) : undefined;
}

export const budgetsUrlConstants = {
  VALID_LIMITS,
  DATE_REGEX,
  SORT_VALUES,
  SORT_DIR_VALUES,
  STATUS_VALUES,
};
