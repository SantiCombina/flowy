import type { TenantEntitlementSnapshot } from '@/payload-types';

import type { Capability } from './capabilities';
import type { EntitlementSnapshot } from './snapshots';

interface QuotasShape {
  maxSellerSeats?: number | null;
  maxProducts?: number | null;
  maxVariantsPerProduct?: number | null;
  maxVariantsPerTenant?: number | null;
}

export interface ResolvedQuotas {
  maxSellerSeats: number;
  maxProducts: number;
  maxVariantsPerProduct: number;
  maxVariantsPerTenant: number;
}

export function snapshotQuotas(snapshot: TenantEntitlementSnapshot): ResolvedQuotas {
  if (snapshot.kind === 'custom') return planQuotasFromRow(snapshot.quotas ?? {});
  if (typeof snapshot.planVersion !== 'object' || snapshot.planVersion === null) {
    throw new Error('Plan snapshot requires a populated plan version');
  }
  return planQuotasFromRow(snapshot.planVersion.quotas ?? {});
}

export function resolveSnapshotQuotas(snapshot: EntitlementSnapshot): ResolvedQuotas {
  if (snapshot.kind === 'plan') {
    const quotas = snapshot.planVersion.quotas ?? {
      maxSellerSeats: 0,
      maxProducts: 0,
      maxVariantsPerProduct: 0,
      maxVariantsPerTenant: 0,
    };
    return {
      maxSellerSeats: quotas.maxSellerSeats,
      maxProducts: quotas.maxProducts,
      maxVariantsPerProduct: quotas.maxVariantsPerProduct,
      maxVariantsPerTenant: quotas.maxVariantsPerTenant,
    };
  }

  throw new Error('Custom snapshot quotas not implemented');
}

export function resolvePlanQuotas(planVersion: { quotas: ResolvedQuotas }): ResolvedQuotas {
  return planVersion.quotas;
}

export function planQuotasFromRow(row: QuotasShape): ResolvedQuotas {
  return {
    maxSellerSeats: row.maxSellerSeats ?? 0,
    maxProducts: row.maxProducts ?? 0,
    maxVariantsPerProduct: row.maxVariantsPerProduct ?? 0,
    maxVariantsPerTenant: row.maxVariantsPerTenant ?? 0,
  };
}

export interface CountResult {
  totalDocs: number;
}

export interface CountDependencies {
  findUsers(args: unknown): Promise<{ docs: unknown[]; totalDocs: number }>;
  findInvitations(args: unknown): Promise<{ docs: unknown[]; totalDocs: number }>;
  findProducts(args: unknown): Promise<{ docs: unknown[]; totalDocs: number }>;
  findVariants(args: unknown): Promise<{ docs: unknown[]; totalDocs: number }>;
}

export interface CountContext {
  transactionID: string | number;
  tenantId: number;
  now: string;
}

export async function countActiveSellers(dependencies: CountDependencies, context: CountContext): Promise<number> {
  const result = await dependencies.findUsers({
    collection: 'users',
    where: {
      and: [
        { owner: { equals: context.tenantId } },
        { role: { equals: 'seller' } },
        { isDeleted: { not_equals: true } },
      ],
    },
    limit: 0,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });
  return result.totalDocs;
}

export async function countPendingInvitations(dependencies: CountDependencies, context: CountContext): Promise<number> {
  const result = await dependencies.findInvitations({
    collection: 'invitations',
    where: {
      and: [
        { createdBy: { equals: context.tenantId } },
        { state: { equals: 'pending' } },
        { usedAt: { exists: false } },
        { expiresAt: { greater_than: context.now } },
      ],
    },
    limit: 0,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });
  return result.totalDocs;
}

export async function countSeats(dependencies: CountDependencies, context: CountContext): Promise<number> {
  const [activeSellers, pendingInvitations] = await Promise.all([
    countActiveSellers(dependencies, context),
    countPendingInvitations(dependencies, context),
  ]);
  return activeSellers + pendingInvitations;
}

export async function countProducts(dependencies: CountDependencies, context: CountContext): Promise<number> {
  const result = await dependencies.findProducts({
    collection: 'products',
    where: { owner: { equals: context.tenantId } },
    limit: 0,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });
  return result.totalDocs;
}

export async function countVariants(dependencies: CountDependencies, context: CountContext): Promise<number> {
  const result = await dependencies.findVariants({
    collection: 'product-variants',
    where: { owner: { equals: context.tenantId } },
    limit: 0,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });
  return result.totalDocs;
}

export async function countVariantsByProduct(
  dependencies: CountDependencies,
  context: Pick<CountContext, 'transactionID'>,
  productId: number,
): Promise<number> {
  const result = await dependencies.findVariants({
    collection: 'product-variants',
    where: { product: { equals: productId } },
    limit: 0,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });
  return result.totalDocs;
}

export function planCapabilities(planCode: 'basic' | 'medium' | 'professional'): readonly Capability[] {
  switch (planCode) {
    case 'basic':
      return [
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
    case 'medium':
    case 'professional':
      return [
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
      ];
    default:
      return [];
  }
}

export function planSeats(planCode: 'basic' | 'medium' | 'professional'): number {
  switch (planCode) {
    case 'basic':
      return 0;
    case 'medium':
      return 2;
    case 'professional':
      return 9;
    default:
      return 0;
  }
}
