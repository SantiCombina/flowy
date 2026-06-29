import type { GetSalesListValues } from '@/schemas/sales/sales-list-schema';

export type MovementType =
  | 'entry'
  | 'exit'
  | 'adjustment'
  | 'sale'
  | 'dispatch_to_mobile'
  | 'return_from_mobile'
  | 'sale_cancelled'
  | 'sale_edit';

export const queryKeys = {
  products: {
    list: (search: string, page: number) => ['products', { search, page }] as const,
    detail: (id: number | undefined) => ['products', 'detail', id] as const,
    demand: () => ['products', 'demand'] as const,
  },
  sales: {
    list: (params?: GetSalesListValues) => {
      if (params) return ['sales', 'list', params] as const;
      return ['sales'] as const;
    },
    options: (role: 'seller' | 'owner', sellerId?: number) => ['saleOptions', { role, sellerId }] as const,
  },
  budgets: {
    list: () => ['budgets'] as const,
    options: () => ['budgetOptions'] as const,
    detail: (id: number | undefined) => ['budgets', 'detail', id] as const,
  },
  sellers: {
    list: () => ['sellers'] as const,
    commissions: {
      detail: (sellerId: number | undefined, year: number, month: number) =>
        ['commissions', 'detail', sellerId, year, month] as const,
    },
  },
  clients: {
    list: () => ['clients'] as const,
  },
  zones: {
    list: () => ['zones'] as const,
  },
  history: {
    list: () => ['history'] as const,
    filtered: (dateRange: { from: Date; to: Date } | undefined, types: MovementType[]) =>
      ['history', { dateRange, types }] as const,
  },
  notifications: {
    list: () => ['notifications'] as const,
  },
  dashboard: {
    owner: (period: string) => ['dashboard', { kind: 'owner', period }] as const,
    seller: (period: string) => ['dashboard', { kind: 'seller', period }] as const,
  },
  mobileInventory: {
    forSeller: (sellerId: number | undefined) => ['mobileInventory', sellerId] as const,
  },
  variantSalesHistory: {
    forVariant: (variantId: number | undefined) => ['variantSalesHistory', variantId] as const,
  },
  user: {
    current: () => ['user', 'current'] as const,
  },
} as const;
