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

export type CapabilityGroup =
  | 'catalog'
  | 'warehouse'
  | 'inventory'
  | 'seller'
  | 'client'
  | 'zones'
  | 'budget'
  | 'sale'
  | 'commission'
  | 'dashboard'
  | 'notification';

export interface CapabilityMeta {
  key: Capability;
  group: CapabilityGroup;
  label: string;
  description: string;
}

export const CAPABILITY_REGISTRY: Readonly<Record<Capability, CapabilityMeta>> = {
  'catalog.manage': {
    key: 'catalog.manage',
    group: 'catalog',
    label: 'Gestión de catálogo',
    description: 'Crear, editar y eliminar productos y variantes.',
  },
  'warehouse.stock': {
    key: 'warehouse.stock',
    group: 'warehouse',
    label: 'Control de stock',
    description: 'Registrar y consultar el stock en depósito.',
  },
  'warehouse.history': {
    key: 'warehouse.history',
    group: 'warehouse',
    label: 'Historial de stock',
    description: 'Ver el historial de movimientos de stock.',
  },
  'client.read': {
    key: 'client.read',
    group: 'client',
    label: 'Lectura de clientes',
    description: 'Ver el listado y detalle de clientes.',
  },
  'client.manage': {
    key: 'client.manage',
    group: 'client',
    label: 'Gestión de clientes',
    description: 'Crear y editar clientes.',
  },
  'client.contact-fields': {
    key: 'client.contact-fields',
    group: 'client',
    label: 'Campos personalizados de cliente',
    description: 'Agregar campos personalizados a la ficha de cliente.',
  },
  'client.delete': {
    key: 'client.delete',
    group: 'client',
    label: 'Eliminar clientes',
    description: 'Dar de baja clientes del sistema.',
  },
  'zones.manage': {
    key: 'zones.manage',
    group: 'zones',
    label: 'Gestión de zonas',
    description: 'Crear y editar zonas de venta.',
  },
  'budget.manage': {
    key: 'budget.manage',
    group: 'budget',
    label: 'Gestión de presupuestos',
    description: 'Crear y editar presupuestos para clientes.',
  },
  'budget.recipient-phone': {
    key: 'budget.recipient-phone',
    group: 'budget',
    label: 'Teléfono del destinatario en presupuestos',
    description: 'Mostrar el teléfono del destinatario en el presupuesto.',
  },
  'sale.create': {
    key: 'sale.create',
    group: 'sale',
    label: 'Registro de ventas',
    description: 'Crear nuevas ventas.',
  },
  'sale.credit': {
    key: 'sale.credit',
    group: 'sale',
    label: 'Ventas a crédito',
    description: 'Permitir ventas con pago parcial o a crédito.',
  },
  'sale.collect': {
    key: 'sale.collect',
    group: 'sale',
    label: 'Cobro de ventas',
    description: 'Registrar cobros sobre ventas existentes.',
  },
  'seller.manage': {
    key: 'seller.manage',
    group: 'seller',
    label: 'Gestión de vendedores',
    description: 'Crear, editar y desactivar vendedores.',
  },
  'seller.invite': {
    key: 'seller.invite',
    group: 'seller',
    label: 'Invitar vendedores',
    description: 'Enviar invitaciones a nuevos vendedores por email.',
  },
  'inventory.mobile': {
    key: 'inventory.mobile',
    group: 'inventory',
    label: 'Inventario móvil',
    description: 'Permitir que los vendedores móviles lleven stock propio.',
  },
  'inventory.assignment': {
    key: 'inventory.assignment',
    group: 'inventory',
    label: 'Asignación de stock a vendedores',
    description: 'Asignar stock del depósito a vendedores móviles.',
  },
  'commission.manage': {
    key: 'commission.manage',
    group: 'commission',
    label: 'Comisiones',
    description: 'Gestionar y liquidar comisiones de vendedores.',
  },
  'dashboard.owner': {
    key: 'dashboard.owner',
    group: 'dashboard',
    label: 'Dashboard para owners',
    description: 'Dashboard con métricas para dueños de negocio.',
  },
  'dashboard.seller': {
    key: 'dashboard.seller',
    group: 'dashboard',
    label: 'Dashboard para vendedores',
    description: 'Dashboard con métricas para vendedores.',
  },
  'notification.read': {
    key: 'notification.read',
    group: 'notification',
    label: 'Notificaciones',
    description: 'Ver notificaciones del sistema.',
  },
};

export const CAPABILITY_GROUPS: ReadonlyArray<{
  key: CapabilityGroup;
  label: string;
  order: number;
}> = [
  { key: 'catalog', label: 'Catálogo', order: 1 },
  { key: 'warehouse', label: 'Almacén', order: 2 },
  { key: 'inventory', label: 'Inventario móvil', order: 3 },
  { key: 'seller', label: 'Vendedores', order: 4 },
  { key: 'client', label: 'Clientes', order: 5 },
  { key: 'zones', label: 'Zonas', order: 6 },
  { key: 'budget', label: 'Presupuestos', order: 7 },
  { key: 'sale', label: 'Ventas', order: 8 },
  { key: 'commission', label: 'Comisiones', order: 9 },
  { key: 'dashboard', label: 'Dashboards', order: 10 },
  { key: 'notification', label: 'Notificaciones', order: 11 },
];

export function getCapabilityLabel(key: Capability): string {
  return CAPABILITY_REGISTRY[key].label;
}

export function groupCapabilitiesByDomain(capabilities: readonly Capability[]): ReadonlyArray<{
  group: CapabilityGroup;
  label: string;
  items: ReadonlyArray<CapabilityMeta>;
}> {
  const byGroup = new Map<CapabilityGroup, CapabilityMeta[]>();
  for (const capability of capabilities) {
    const meta = CAPABILITY_REGISTRY[capability];
    const list = byGroup.get(meta.group) ?? [];
    list.push(meta);
    byGroup.set(meta.group, list);
  }
  return [...byGroup.entries()]
    .map(([group, items]) => {
      const groupMeta = CAPABILITY_GROUPS.find((entry) => entry.key === group);
      return groupMeta ? { group, label: groupMeta.label, items } : null;
    })
    .filter(
      (
        entry,
      ): entry is {
        group: CapabilityGroup;
        label: string;
        items: CapabilityMeta[];
      } => entry !== null,
    )
    .sort((a, b) => {
      const orderA = CAPABILITY_GROUPS.find((entry) => entry.key === a.group)?.order ?? 999;
      const orderB = CAPABILITY_GROUPS.find((entry) => entry.key === b.group)?.order ?? 999;
      return orderA - orderB;
    });
}
