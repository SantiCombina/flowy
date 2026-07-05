export const cacheTags = {
  sales: (id: number) => `sales-${id}` as const,
  products: (id: number) => `products-${id}` as const,
  history: (id: number) => `history-${id}` as const,
  clients: (id: number) => `clients-${id}` as const,
  clientsDebts: (id: number) => `clients-debts-${id}` as const,
  budgets: () => 'budgets' as const,
  dashboard: () => 'dashboard' as const,
  dashboardPerOwner: (id: number) => `dashboard-${id}` as const,
  productDemand: (id: number) => `product-demand-${id}` as const,
  saleOptions: (ownerId: number) => `sale-options-${ownerId}` as const,
} as const;
