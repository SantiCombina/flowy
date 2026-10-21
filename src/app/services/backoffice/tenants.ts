'use server';

import type { Where } from 'payload';

import { defaultEntitlementDependencies } from '@/app/services/entitlements';
import type { PlanCode } from '@/lib/entitlements/capabilities';
import { acquireTenantLock } from '@/lib/entitlements/locks';
import { getPayloadClient } from '@/lib/payload';
import type { Invitation, Product, ProductVariant, Sale, TenantEntitlementSnapshot, User } from '@/payload-types';

export interface TenantRow {
  id: number;
  businessName: string | null;
  email: string;
  planCode: PlanCode | null;
  entitlementState: 'provisioning' | 'active' | 'blocked' | null;
  createdAt: string;
}

export interface ListTenantsResult {
  docs: TenantRow[];
  totalDocs: number;
  page: number;
  totalPages: number;
}

export async function listTenants(params: { limit?: number } = {}): Promise<ListTenantsResult> {
  const payload = await getPayloadClient();

  const conditions: Where[] = [{ role: { equals: 'owner' } }, { isDeleted: { not_equals: true } }];

  const result = await payload.find({
    collection: 'users',
    where: { and: conditions },
    sort: '-createdAt',
    limit: params.limit ?? 1000,
    depth: 2,
    overrideAccess: true,
  });

  const docs: TenantRow[] = (result.docs as User[]).map((owner) => {
    const snapshot = owner.activeEntitlementSnapshot;
    const planVersion = snapshot && typeof snapshot !== 'number' ? snapshot.planVersion : null;
    const planCode = planVersion && typeof planVersion !== 'number' ? planVersion.planCode : null;
    return {
      id: owner.id,
      businessName: owner.businessName ?? null,
      email: owner.email,
      planCode,
      entitlementState: owner.entitlementState ?? null,
      createdAt: owner.createdAt,
    };
  });

  return {
    docs,
    totalDocs: docs.length,
    page: 1,
    totalPages: 1,
  };
}

export interface TenantSellerRow {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  isMobile: boolean;
}

export interface TenantProductRow {
  id: number;
  name: string;
  description: string | null;
  variantsCount: number;
  createdAt: string;
}

export interface TenantSaleRow {
  id: number;
  total: number;
  amountPaid: number;
  paymentStatus: 'pending' | 'partially_collected' | 'collected';
  createdAt: string;
  sellerName: string | null;
  clientName: string | null;
}

export interface TenantSnapshotRow {
  id: number;
  sequence: number;
  kind: 'plan' | 'custom';
  planCode: PlanCode | null;
  planVersion: number | null;
  quotas: {
    maxSellerSeats: number | null;
    maxProducts: number | null;
    maxVariantsPerProduct: number | null;
    maxVariantsPerTenant: number | null;
  } | null;
  capabilities: string[];
  createdAt: string;
  previousSnapshots: TenantSnapshotRow[];
}

export interface TenantDetailData {
  availablePlans: { id: number; label: string }[];
  owner: {
    id: number;
    businessName: string | null;
    name: string;
    email: string;
    entitlementState: 'provisioning' | 'active' | 'blocked' | null;
    createdAt: string;
    isActive: boolean;
    planControlDate: string | null;
    hasCustomPlan: boolean;
  };
  activePlan: {
    id: number;
    assignedAt: string;
    planCode: PlanCode;
    version: number;
    capabilities: string[];
    quotas: {
      maxSellerSeats: number;
      maxProducts: number;
      maxVariantsPerProduct: number;
      maxVariantsPerTenant: number;
    };
  } | null;
  sellers: TenantSellerRow[];
  products: TenantProductRow[];
  sales: TenantSaleRow[];
  snapshots: TenantSnapshotRow[];
  stats: {
    sellersCount: number;
    productsCount: number;
    salesCount: number;
    lastSaleAt: string | null;
  };
}

const PLAN_MOBILE_CAPABILITY = 'inventory.mobile';

function resolveActivePlan(snapshot: User['activeEntitlementSnapshot']): TenantDetailData['activePlan'] {
  if (!snapshot || typeof snapshot === 'number') return null;

  const planVersion = snapshot.planVersion;
  if (!planVersion || typeof planVersion === 'number') return null;

  return {
    id: planVersion.id,
    assignedAt: snapshot.createdAt,
    planCode: planVersion.planCode,
    version: planVersion.version,
    capabilities: planVersion.capabilities.map((entry) => entry.capability),
    quotas: { ...planVersion.quotas },
  };
}

function planGrantsMobile(plan: TenantDetailData['activePlan']): boolean {
  if (!plan) return false;
  return plan.capabilities.includes(PLAN_MOBILE_CAPABILITY);
}

export async function getTenantDetail(id: number): Promise<TenantDetailData | null> {
  const payload = await getPayloadClient();

  let owner: User;
  try {
    owner = (await payload.findByID({
      collection: 'users',
      id,
      depth: 2,
      overrideAccess: true,
    })) as User;
  } catch {
    return null;
  }

  if (owner.role !== 'owner' || owner.isDeleted) {
    return null;
  }

  const activePlan = resolveActivePlan(owner.activeEntitlementSnapshot);
  const planHasMobile = planGrantsMobile(activePlan);

  const [sellersResult, productsResult, salesResult, snapshotsResult, plansResult] = await Promise.all([
    payload.find({
      collection: 'users',
      where: {
        and: [{ owner: { equals: id } }, { role: { equals: 'seller' } }, { isDeleted: { not_equals: true } }],
      },
      sort: '-createdAt',
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'products',
      where: { owner: { equals: id } },
      sort: '-createdAt',
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'sales',
      where: { owner: { equals: id } },
      sort: '-createdAt',
      limit: 50,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'tenant-entitlement-snapshots',
      where: { tenant: { equals: id } },
      sort: '-sequence',
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'plan-versions',
      where: { publishedAt: { less_than_equal: new Date().toISOString() } },
      sort: '-version',
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const sellers: TenantSellerRow[] = (sellersResult.docs as User[]).map((seller) => ({
    id: seller.id,
    name: seller.name,
    email: seller.email,
    createdAt: seller.createdAt,
    isMobile: planHasMobile,
  }));

  const productIds = (productsResult.docs as Product[]).map((product) => product.id);
  const variantsCountMap = new Map<number, number>();

  if (productIds.length > 0) {
    const variantsResult = await payload.find({
      collection: 'product-variants',
      where: {
        and: [{ product: { in: productIds } }, { owner: { equals: id } }],
      },
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    });
    for (const variant of variantsResult.docs as ProductVariant[]) {
      const productId = typeof variant.product === 'number' ? variant.product : variant.product?.id;
      if (typeof productId === 'number') {
        variantsCountMap.set(productId, (variantsCountMap.get(productId) ?? 0) + 1);
      }
    }
  }

  const products: TenantProductRow[] = (productsResult.docs as Product[]).map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    variantsCount: variantsCountMap.get(product.id) ?? 0,
    createdAt: product.createdAt,
  }));

  const sales: TenantSaleRow[] = (salesResult.docs as Sale[]).map((sale) => {
    const seller = sale.seller && typeof sale.seller === 'object' ? sale.seller : null;
    const client = sale.client && typeof sale.client === 'object' ? sale.client : null;
    return {
      id: sale.id,
      total: sale.total,
      amountPaid: sale.amountPaid,
      paymentStatus: sale.paymentStatus,
      createdAt: sale.createdAt,
      sellerName: seller?.name ?? null,
      clientName: client?.name ?? null,
    };
  });

  const snapshots: TenantSnapshotRow[] = (snapshotsResult.docs as TenantEntitlementSnapshot[]).map((snap) => {
    const planVersion = snap.planVersion && typeof snap.planVersion !== 'number' ? snap.planVersion : null;
    return {
      id: snap.id,
      sequence: snap.sequence,
      kind: snap.kind,
      planCode: planVersion?.planCode ?? null,
      planVersion: planVersion?.version ?? null,
      quotas: snap.quotas
        ? {
            maxSellerSeats: snap.quotas.maxSellerSeats ?? null,
            maxProducts: snap.quotas.maxProducts ?? null,
            maxVariantsPerProduct: snap.quotas.maxVariantsPerProduct ?? null,
            maxVariantsPerTenant: snap.quotas.maxVariantsPerTenant ?? null,
          }
        : null,
      capabilities: snap.pool?.map((entry) => entry.capability) ?? [],
      createdAt: snap.createdAt,
      previousSnapshots: [],
    };
  });

  snapshots.sort((a, b) => b.sequence - a.sequence);

  return {
    availablePlans: plansResult.docs
      .filter((plan, index, plans) => plans.findIndex((entry) => entry.planCode === plan.planCode) === index)
      .map((plan) => ({
        id: plan.id,
        label: `${plan.planCode.charAt(0).toUpperCase()}${plan.planCode.slice(1)} · v${plan.version}`,
      })),
    owner: {
      id: owner.id,
      businessName: owner.businessName ?? null,
      name: owner.name,
      email: owner.email,
      entitlementState: owner.entitlementState ?? null,
      createdAt: owner.createdAt,
      isActive: owner.isActive !== false,
      planControlDate: owner.planControlDate ?? null,
      hasCustomPlan:
        typeof owner.activeEntitlementSnapshot === 'object' && owner.activeEntitlementSnapshot?.kind === 'custom',
    },
    activePlan,
    sellers,
    products,
    sales,
    snapshots,
    stats: {
      sellersCount: sellers.length,
      productsCount: products.length,
      salesCount: sales.length,
      lastSaleAt: sales[0]?.createdAt ?? null,
    },
  };
}

export async function getManagedTenant(ownerId: number): Promise<User | null> {
  const payload = await getPayloadClient();
  const owner = await payload.findByID({
    collection: 'users',
    id: ownerId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  });
  return owner?.role === 'owner' && !owner.isDeleted ? owner : null;
}

export async function updateTenantControlDate(ownerId: number, planControlDate: string | null): Promise<void> {
  const payload = await getPayloadClient();
  await payload.update({
    collection: 'users',
    where: { and: [{ id: { equals: ownerId } }, { role: { equals: 'owner' } }, { isDeleted: { not_equals: true } }] },
    data: { planControlDate },
    overrideAccess: true,
  });
}

export async function deactivateTenant(ownerId: number): Promise<void> {
  const deps = await defaultEntitlementDependencies(ownerId);
  try {
    const nonce = await acquireTenantLock(deps.lock, deps.lockContext);
    const owner = await deps.findUserById({
      collection: 'users',
      id: ownerId,
      depth: 0,
      overrideAccess: true,
      req: { transactionID: deps.transactionID },
    });
    if (owner.role !== 'owner' || owner.isDeleted) throw new Error('Tenant no encontrado');
    if (owner.isActive === false) {
      await deps.rollback();
      return;
    }
    await deps.updateUser({
      collection: 'users',
      id: ownerId,
      data: { isActive: false, entitlementState: 'blocked' },
      overrideAccess: true,
      context: { entitlementMutation: true },
      req: { transactionID: deps.transactionID },
    });
    await deps.emitMutation({
      collection: 'entitlement-outbox',
      data: {
        idempotencyKey: `mutation:${ownerId}:${nonce}:deactivate`,
        kind: 'entitlement.mutation',
        aggregate: `tenant:${ownerId}`,
        payload: {
          tenantId: ownerId,
          nonce,
          action: 'tenant.deactivated',
          previousState: owner.entitlementState ?? 'provisioning',
          snapshotId:
            typeof owner.activeEntitlementSnapshot === 'number'
              ? owner.activeEntitlementSnapshot
              : (owner.activeEntitlementSnapshot?.id ?? null),
        },
        state: 'sent',
        attempts: 0,
        availableAt: deps.now,
      },
      overrideAccess: true,
      context: { entitlementMutation: true },
      req: { transactionID: deps.transactionID },
    });
    await deps.commit();
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

export type ReactivateTenantResult =
  | { requiresRecovery: true }
  | { requiresRecovery: false; entitlementState: NonNullable<User['entitlementState']> };

export async function reactivateTenant(
  ownerId: number,
  recoveryConfirmed: boolean,
  adminId: number,
): Promise<ReactivateTenantResult> {
  const payload = await getPayloadClient();
  const deps = await defaultEntitlementDependencies(ownerId);
  try {
    const nonce = await acquireTenantLock(deps.lock, deps.lockContext);
    const owner = await deps.findUserById({
      collection: 'users',
      id: ownerId,
      depth: 0,
      overrideAccess: true,
      req: { transactionID: deps.transactionID },
    });
    if (owner.role !== 'owner' || owner.isDeleted) throw new Error('Tenant no encontrado');
    if (owner.isActive !== false && owner.entitlementState !== 'blocked') {
      await deps.rollback();
      return { requiresRecovery: false, entitlementState: owner.entitlementState ?? 'provisioning' };
    }
    const history = await payload.find({
      collection: 'entitlement-outbox',
      where: {
        and: [
          { aggregate: { equals: `tenant:${ownerId}` } },
          { kind: { equals: 'entitlement.mutation' } },
          { idempotencyKey: { contains: ':deactivate' } },
        ],
      },
      sort: '-id',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req: { transactionID: deps.transactionID },
    });
    const previous = history.docs[0]?.payload;
    const snapshotId =
      typeof owner.activeEntitlementSnapshot === 'number'
        ? owner.activeEntitlementSnapshot
        : (owner.activeEntitlementSnapshot?.id ?? null);
    let entitlementState: NonNullable<User['entitlementState']> = 'blocked';
    if (
      owner.isActive === false &&
      previous &&
      typeof previous === 'object' &&
      !Array.isArray(previous) &&
      previous.action === 'tenant.deactivated' &&
      previous.tenantId === ownerId
    ) {
      if (previous.previousState === 'blocked') entitlementState = 'blocked';
      if (previous.previousState === 'provisioning' && previous.snapshotId === snapshotId) {
        entitlementState = 'provisioning';
      }
      if (previous.previousState === 'active' && previous.snapshotId === snapshotId && snapshotId !== null) {
        entitlementState = 'active';
      }
    }
    const needsRecovery = entitlementState === 'blocked';
    if (needsRecovery && !recoveryConfirmed) {
      await deps.rollback();
      return { requiresRecovery: true };
    }
    if (needsRecovery) entitlementState = 'provisioning';
    await deps.updateUser({
      collection: 'users',
      id: ownerId,
      data: { isActive: true, entitlementState },
      overrideAccess: true,
      context: { entitlementMutation: true },
      req: { transactionID: deps.transactionID },
    });
    await deps.emitMutation({
      collection: 'entitlement-outbox',
      data: {
        idempotencyKey: `mutation:${ownerId}:${nonce}:reactivate`,
        kind: 'entitlement.mutation',
        aggregate: `tenant:${ownerId}`,
        payload: {
          tenantId: ownerId,
          nonce,
          action: needsRecovery ? 'tenant.access-recovered' : 'tenant.reactivated',
          recoveryConfirmed: needsRecovery && recoveryConfirmed,
          adminId,
          entitlementState,
          snapshotId,
        },
        state: 'sent',
        attempts: 0,
        availableAt: deps.now,
      },
      overrideAccess: true,
      context: { entitlementMutation: true },
      req: { transactionID: deps.transactionID },
    });
    await deps.commit();
    return { requiresRecovery: false, entitlementState };
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

export async function getTenantSellers(ownerId: number): Promise<TenantSellerRow[]> {
  const payload = await getPayloadClient();

  const [sellersResult, ownerResult] = await Promise.all([
    payload.find({
      collection: 'users',
      where: {
        and: [{ owner: { equals: ownerId } }, { role: { equals: 'seller' } }, { isDeleted: { not_equals: true } }],
      },
      sort: '-createdAt',
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    }),
    payload.findByID({
      collection: 'users',
      id: ownerId,
      depth: 2,
      overrideAccess: true,
    }),
  ]);

  const owner = ownerResult as User;
  const activePlan = resolveActivePlan(owner.activeEntitlementSnapshot);
  const planHasMobile = planGrantsMobile(activePlan);

  return (sellersResult.docs as User[]).map((seller) => ({
    id: seller.id,
    name: seller.name,
    email: seller.email,
    createdAt: seller.createdAt,
    isMobile: planHasMobile,
  }));
}

export async function getTenantProducts(ownerId: number): Promise<TenantProductRow[]> {
  const payload = await getPayloadClient();

  const productsResult = await payload.find({
    collection: 'products',
    where: { owner: { equals: ownerId } },
    sort: '-createdAt',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  });

  const products = productsResult.docs as Product[];
  const productIds = products.map((product) => product.id);

  const variantsCountMap = new Map<number, number>();
  if (productIds.length > 0) {
    const variantsResult = await payload.find({
      collection: 'product-variants',
      where: {
        and: [{ product: { in: productIds } }, { owner: { equals: ownerId } }],
      },
      limit: 5000,
      depth: 0,
      overrideAccess: true,
    });
    for (const variant of variantsResult.docs as ProductVariant[]) {
      const productId = typeof variant.product === 'number' ? variant.product : variant.product?.id;
      if (typeof productId === 'number') {
        variantsCountMap.set(productId, (variantsCountMap.get(productId) ?? 0) + 1);
      }
    }
  }

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    variantsCount: variantsCountMap.get(product.id) ?? 0,
    createdAt: product.createdAt,
  }));
}

export async function getTenantSales(ownerId: number): Promise<TenantSaleRow[]> {
  const payload = await getPayloadClient();

  const salesResult = await payload.find({
    collection: 'sales',
    where: { owner: { equals: ownerId } },
    sort: '-createdAt',
    limit: 50,
    depth: 1,
    overrideAccess: true,
  });

  return (salesResult.docs as Sale[]).map((sale) => {
    const seller = sale.seller && typeof sale.seller === 'object' ? sale.seller : null;
    const client = sale.client && typeof sale.client === 'object' ? sale.client : null;
    return {
      id: sale.id,
      total: sale.total,
      amountPaid: sale.amountPaid,
      paymentStatus: sale.paymentStatus,
      createdAt: sale.createdAt,
      sellerName: seller?.name ?? null,
      clientName: client?.name ?? null,
    };
  });
}

export async function getTenantSnapshots(ownerId: number): Promise<TenantSnapshotRow[]> {
  const payload = await getPayloadClient();

  const snapshotsResult = await payload.find({
    collection: 'tenant-entitlement-snapshots',
    where: { tenant: { equals: ownerId } },
    sort: '-sequence',
    limit: 1000,
    depth: 1,
    overrideAccess: true,
  });

  const snapshots: TenantSnapshotRow[] = (snapshotsResult.docs as TenantEntitlementSnapshot[]).map((snap) => {
    const planVersion = snap.planVersion && typeof snap.planVersion !== 'number' ? snap.planVersion : null;
    return {
      id: snap.id,
      sequence: snap.sequence,
      kind: snap.kind,
      planCode: planVersion?.planCode ?? null,
      planVersion: planVersion?.version ?? null,
      quotas: snap.quotas
        ? {
            maxSellerSeats: snap.quotas.maxSellerSeats ?? null,
            maxProducts: snap.quotas.maxProducts ?? null,
            maxVariantsPerProduct: snap.quotas.maxVariantsPerProduct ?? null,
            maxVariantsPerTenant: snap.quotas.maxVariantsPerTenant ?? null,
          }
        : null,
      capabilities: snap.pool?.map((entry) => entry.capability) ?? [],
      createdAt: snap.createdAt,
      previousSnapshots: [],
    };
  });

  return snapshots.sort((a, b) => b.sequence - a.sequence);
}

export interface PendingInvitationRow {
  id: number;
  name: string | null | undefined;
  email: string;
  role: 'owner' | 'seller';
  expiresAt: string;
  createdAt: string;
  createdByEmail: string | null;
}

export async function listPendingInvitationsByCurrentAdmin(): Promise<PendingInvitationRow[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'invitations',
    where: {
      state: { equals: 'pending' },
    },
    sort: '-createdAt',
    limit: 200,
    depth: 1,
    overrideAccess: true,
  });

  return (result.docs as Invitation[]).map((invitation) => {
    const createdBy = invitation.createdBy;
    const createdByEmail =
      createdBy && typeof createdBy === 'object' ? ((createdBy as { email?: string | null }).email ?? null) : null;
    return {
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt ?? '',
      createdAt: invitation.createdAt,
      createdByEmail,
    };
  });
}
