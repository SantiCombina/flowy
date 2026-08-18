'use server';

import type { Where } from 'payload';

import type { PlanCode } from '@/lib/entitlements/capabilities';
import { getPayloadClient } from '@/lib/payload';
import { normalizeText } from '@/lib/text';
import type { Product, ProductVariant, Sale, TenantEntitlementSnapshot, User } from '@/payload-types';
import type { TenantListValues } from '@/schemas/backoffice/tenant-list-schema';

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

export async function listTenants(params: TenantListValues): Promise<ListTenantsResult> {
  const payload = await getPayloadClient();

  const conditions: Where[] = [{ role: { equals: 'owner' } }, { isDeleted: { not_equals: true } }];

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch) {
    const normalized = normalizeText(trimmedSearch);
    conditions.push({ or: [{ businessName: { like: normalized } }, { email: { like: trimmedSearch } }] });
  }
  if (params.planCode) {
    conditions.push({ 'activeEntitlementSnapshot.planVersion.planCode': { equals: params.planCode } });
  }
  if (params.state) {
    conditions.push({ entitlementState: { equals: params.state } });
  }

  const result = await payload.find({
    collection: 'users',
    where: { and: conditions },
    sort: '-createdAt',
    page: params.page,
    limit: params.limit,
    depth: 1,
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
    totalDocs: result.totalDocs,
    page: result.page ?? params.page,
    totalPages: result.totalPages ?? 1,
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
  isActive: boolean;
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
  owner: {
    id: number;
    businessName: string | null;
    name: string;
    email: string;
    entitlementState: 'provisioning' | 'active' | 'blocked' | null;
    createdAt: string;
  };
  activePlan: {
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

function resolveActivePlan(
  snapshot: User['activeEntitlementSnapshot'],
  entitlementState: User['entitlementState'],
): TenantDetailData['activePlan'] {
  if (entitlementState === 'provisioning' || entitlementState === 'blocked') return null;
  if (!snapshot || typeof snapshot === 'number') return null;

  const planVersion = snapshot.planVersion;
  if (!planVersion || typeof planVersion === 'number') return null;

  return {
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
      depth: 1,
      overrideAccess: true,
    })) as User;
  } catch {
    return null;
  }

  if (owner.role !== 'owner') {
    return null;
  }

  const activePlan = resolveActivePlan(owner.activeEntitlementSnapshot, owner.entitlementState);
  const planHasMobile = planGrantsMobile(activePlan);

  const [sellersResult, productsResult, salesResult, snapshotsResult] = await Promise.all([
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
      where: { and: [{ product: { in: productIds } }, { owner: { equals: id } }] },
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
    isActive: product.isActive ?? true,
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
    owner: {
      id: owner.id,
      businessName: owner.businessName ?? null,
      name: owner.name,
      email: owner.email,
      entitlementState: owner.entitlementState ?? null,
      createdAt: owner.createdAt,
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
      depth: 1,
      overrideAccess: true,
    }),
  ]);

  const owner = ownerResult as User;
  const activePlan = resolveActivePlan(owner.activeEntitlementSnapshot, owner.entitlementState);
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
      where: { and: [{ product: { in: productIds } }, { owner: { equals: ownerId } }] },
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
    isActive: product.isActive ?? true,
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
