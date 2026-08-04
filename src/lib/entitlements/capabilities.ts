export const CAPABILITIES = [
  'catalog.manage',
  'warehouse.stock',
  'warehouse.history',
  'client.read',
  'client.manage',
  'client.contact-fields',
  'client.delete',
  'zones.manage',
  'budget.manage',
  'budget.recipient-phone',
  'sale.create',
  'sale.credit',
  'sale.collect',
  'seller.manage',
  'seller.invite',
  'inventory.mobile',
  'inventory.assignment',
  'commission.manage',
  'dashboard.owner',
  'dashboard.seller',
  'notification.read',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type EntitlementRole = 'owner' | 'seller';

export type PlanCode = 'basic' | 'medium' | 'professional';

const basicCapabilities: readonly Capability[] = [
  'catalog.manage',
  'warehouse.stock',
  'warehouse.history',
  'client.read',
  'client.manage',
  'budget.manage',
  'sale.create',
  'sale.credit',
  'sale.collect',
  'dashboard.owner',
  'notification.read',
];

const sellerCapabilities: readonly Capability[] = [
  'warehouse.stock',
  'client.read',
  'client.manage',
  'client.contact-fields',
  'budget.manage',
  'budget.recipient-phone',
  'sale.create',
  'sale.credit',
  'sale.collect',
  'inventory.mobile',
  'dashboard.seller',
  'notification.read',
];

const capabilityDependencies: Partial<Record<Capability, readonly Capability[]>> = {
  'client.contact-fields': ['client.manage'],
  'client.delete': ['client.manage'],
  'budget.recipient-phone': ['budget.manage'],
  'sale.credit': ['sale.create'],
  'sale.collect': ['sale.create'],
  'seller.invite': ['seller.manage'],
  'inventory.mobile': ['warehouse.stock'],
  'inventory.assignment': ['warehouse.stock', 'inventory.mobile'],
  'commission.manage': ['sale.collect'],
};

const fullCapabilities = CAPABILITIES;

function intersectCapabilities(source: readonly Capability[], allowed: ReadonlySet<Capability>): Set<Capability> {
  return new Set(source.filter((capability) => allowed.has(capability)));
}

export function roleCapabilities(role: EntitlementRole): ReadonlySet<Capability> {
  return new Set(role === 'owner' ? fullCapabilities : sellerCapabilities);
}

export function getPlanCapabilities(planCode: PlanCode, role: EntitlementRole): Set<Capability> {
  if (planCode === 'basic') {
    return role === 'owner' ? new Set(basicCapabilities) : new Set();
  }

  return intersectCapabilities(fullCapabilities, roleCapabilities(role));
}

export function validateCapabilityDependencies(capabilities: readonly Capability[]): Capability[] {
  const assignedCapabilities = new Set(capabilities);
  const missingDependencies = new Set<Capability>();

  for (const capability of capabilities) {
    for (const dependency of capabilityDependencies[capability] ?? []) {
      if (!assignedCapabilities.has(dependency)) {
        missingDependencies.add(dependency);
      }
    }
  }

  return [...missingDependencies];
}

export interface CustomCapabilityResolution {
  kind: 'custom';
  role: EntitlementRole;
  pool: readonly Capability[];
  grant: readonly Capability[];
}

export function resolveEffectiveCapabilities({ kind, role, pool, grant }: CustomCapabilityResolution): Set<Capability> {
  const grantedCapabilities = new Set(grant);
  const roleAllowedCapabilities = roleCapabilities(role);

  if (kind !== 'custom') {
    return new Set();
  }

  return new Set(
    pool.filter((capability) => grantedCapabilities.has(capability) && roleAllowedCapabilities.has(capability)),
  );
}
