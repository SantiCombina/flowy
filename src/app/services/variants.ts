'use server';

import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import {
  countVariants,
  countVariantsByProduct,
  snapshotQuotas,
  type CountContext,
  type CountDependencies,
} from '@/lib/entitlements/quotas';
import type { ProductVariant, TenantEntitlementSnapshot, User } from '@/payload-types';

import type { CreateVariantData, UpdateVariantData } from './products';

export type { CreateVariantData, UpdateVariantData };

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export interface VariantQuotaDependencies {
  transactionID: string | number;
  lock: LockDependencies;
  lockContext: LockContext;
  count: CountDependencies;
  countContext: CountContext;
  findUserById(args: unknown): Promise<User>;
  findSnapshot(args: unknown): Promise<{ docs: TenantEntitlementSnapshot[] }>;
  createVariant(args: unknown): Promise<ProductVariant>;
  emitMutation(args: {
    collection: 'entitlement-outbox';
    data: Record<string, unknown>;
    overrideAccess: true;
    context: { entitlementMutation: true };
    req: { transactionID: string | number };
  }): Promise<unknown>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function createVariantWithQuota(
  data: CreateVariantData,
  ownerId: number,
  dependencies?: VariantQuotaDependencies,
): Promise<ProductVariant> {
  if (dependencies) {
    return runCreateVariantWithQuota(data, ownerId, dependencies);
  }

  const deps = await defaultVariantQuotaDependencies(ownerId);
  try {
    const variant = await runCreateVariantWithQuota(data, ownerId, deps);
    await deps.commit();
    return variant;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

async function runCreateVariantWithQuota(
  data: CreateVariantData,
  ownerId: number,
  dependencies: VariantQuotaDependencies,
): Promise<ProductVariant> {
  const mutationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const productId = typeof data.product === 'number' ? data.product : data.product?.id;
  if (!productId) {
    throw new Error('El producto es requerido');
  }

  const snapshot = await resolveTenantSnapshot(dependencies, ownerId);
  const quotas = snapshot ? snapshotQuotas(snapshot) : null;
  const maxVariantsPerProduct = quotas?.maxVariantsPerProduct ?? 0;
  const maxVariantsPerTenant = quotas?.maxVariantsPerTenant ?? 0;

  if (maxVariantsPerProduct > 0) {
    const count = await countVariantsByProduct(
      dependencies.count,
      { transactionID: dependencies.transactionID },
      productId,
    );
    if (count >= maxVariantsPerProduct) {
      throw new Error('Límite de variantes por producto alcanzado');
    }
  }

  if (maxVariantsPerTenant > 0) {
    const count = await countVariants(dependencies.count, dependencies.countContext);
    if (count >= maxVariantsPerTenant) {
      throw new Error('Límite de variantes por negocio alcanzado');
    }
  }

  const variant = await dependencies.createVariant({
    collection: 'product-variants',
    data: { ...data, product: productId, owner: ownerId },
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.emitMutation({
    collection: 'entitlement-outbox',
    data: {
      idempotencyKey: `mutation:${ownerId}:${mutationNonce}`,
      kind: 'entitlement.mutation',
      aggregate: `tenant:${ownerId}`,
      payload: { tenantId: ownerId, nonce: mutationNonce },
      state: 'sent',
      attempts: 0,
      availableAt: dependencies.countContext.now,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  return variant;
}

async function resolveTenantSnapshot(
  dependencies: VariantQuotaDependencies,
  tenantId: number,
): Promise<TenantEntitlementSnapshot | null> {
  const user = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  const snapshotId =
    typeof user.activeEntitlementSnapshot === 'number'
      ? user.activeEntitlementSnapshot
      : (user.activeEntitlementSnapshot?.id ?? null);
  if (snapshotId === null) return null;

  const result = await dependencies.findSnapshot({
    collection: 'tenant-entitlement-snapshots',
    where: {
      and: [{ tenant: { equals: tenantId } }, { id: { equals: snapshotId } }],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  return result.docs[0] ?? null;
}

async function defaultVariantQuotaDependencies(ownerId: number): Promise<VariantQuotaDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  return {
    transactionID,
    lock,
    lockContext: { transactionID, tenantId: ownerId },
    count: {
      findUsers: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findInvitations: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findProducts: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findVariants: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
    },
    countContext: { transactionID, tenantId: ownerId, now: new Date().toISOString() },
    findUserById: async (args) => payload.findByID(args as never) as unknown as Promise<User>,
    findSnapshot: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: TenantEntitlementSnapshot[] }>,
    createVariant: async (args) => payload.create(args as never) as unknown as Promise<ProductVariant>,
    emitMutation: async (args) => payload.create(args as never) as unknown,
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}
