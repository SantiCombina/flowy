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
  },
  sales: {
    list: () => ['sales'] as const,
    options: (role: 'seller' | 'owner', sellerId?: number) => ['saleOptions', { role, sellerId }] as const,
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
} as const;
