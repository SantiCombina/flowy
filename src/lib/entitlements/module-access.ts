import type { Capability } from '@/lib/entitlements/capabilities';

export const MODULE_ACCESS = {
  '/products': {
    href: '/products',
    title: 'Productos',
    capability: 'catalog.manage',
  },
  '/sellers': {
    href: '/sellers',
    title: 'Vendedores',
    capability: 'seller.manage',
  },
  '/assignments': {
    href: '/assignments',
    title: 'Asignaciones',
    capability: 'inventory.assignment',
  },
  '/history': {
    href: '/history',
    title: 'Historial',
    capability: 'warehouse.history',
  },
  '/sales': {
    href: '/sales',
    title: 'Ventas',
    capability: 'sale.create',
  },
  '/budgets': {
    href: '/budgets',
    title: 'Presupuestos',
    capability: 'budget.manage',
  },
  '/clients': {
    href: '/clients',
    title: 'Clientes',
    capability: 'client.read',
  },
  '/mobile-inventory': {
    href: '/mobile-inventory',
    title: 'Mi inventario',
    capability: 'inventory.mobile',
  },
} as const satisfies Record<string, { href: string; title: string; capability: Capability }>;

export type ModuleRoute = keyof typeof MODULE_ACCESS;
export type ModuleAccess = (typeof MODULE_ACCESS)[ModuleRoute];

export function hasModuleAccess(capabilities: readonly string[] | ReadonlySet<string>, access: ModuleAccess): boolean {
  const capabilitySet = capabilities instanceof Set ? capabilities : new Set(capabilities);

  return capabilitySet.has(access.capability);
}

export function resolveProductsTenantId(user: { id: number; role: string }): number | null {
  return user.role === 'owner' || user.role === 'admin' ? user.id : null;
}
