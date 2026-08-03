'use server';

import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import { countSeats, planQuotasFromRow, type CountContext, type CountDependencies } from '@/lib/entitlements/quotas';
import { getPayloadClient } from '@/lib/payload';
import type { TenantEntitlementSnapshot, User } from '@/payload-types';

export interface ReactivateSellerDependencies {
  transactionID: string | number;
  now: string;
  lock: LockDependencies;
  lockContext: LockContext;
  count: CountDependencies;
  countContext: CountContext;
  findUserById(args: unknown): Promise<User>;
  updateUser(args: unknown): Promise<User>;
  findSnapshot(args: unknown): Promise<{ docs: TenantEntitlementSnapshot[] }>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function reactivateSeller(sellerId: number, dependencies?: ReactivateSellerDependencies): Promise<User> {
  if (dependencies) {
    return runReactivateSeller(sellerId, dependencies);
  }

  const deps = await defaultReactivateSellerDependencies(sellerId);
  try {
    const user = await runReactivateSeller(sellerId, deps);
    await deps.commit();
    return user;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

async function runReactivateSeller(sellerId: number, dependencies: ReactivateSellerDependencies): Promise<User> {
  const seller = await dependencies.findUserById({
    collection: 'users',
    id: sellerId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  if (seller.role !== 'seller') {
    throw new Error('Solo los vendedores pueden ser reactivados');
  }

  const ownerId = typeof seller.owner === 'number' ? seller.owner : (seller.owner?.id ?? null);
  if (ownerId === null) {
    throw new Error('El vendedor no tiene un dueño asignado');
  }

  await acquireTenantLock(dependencies.lock, { ...dependencies.lockContext, tenantId: ownerId });

  const snapshot = await resolveTenantSnapshot(dependencies, ownerId);
  const quotas = snapshot ? planQuotasFromRow(snapshot.quotas ?? {}) : null;
  const maxSeats = quotas?.maxSellerSeats ?? 0;

  if (maxSeats > 0) {
    const usedSeats = await countSeats(dependencies.count, {
      ...dependencies.countContext,
      tenantId: ownerId,
    });
    if (usedSeats >= maxSeats) {
      throw new Error('No hay asientos de vendedor disponibles');
    }
  }

  return dependencies.updateUser({
    collection: 'users',
    id: sellerId,
    data: { isActive: true, isDeleted: false },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });
}

async function resolveTenantSnapshot(
  dependencies: ReactivateSellerDependencies,
  tenantId: number,
): Promise<TenantEntitlementSnapshot | null> {
  const owner = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  const snapshotId =
    typeof owner.activeEntitlementSnapshot === 'number'
      ? owner.activeEntitlementSnapshot
      : (owner.activeEntitlementSnapshot?.id ?? null);

  if (snapshotId === null) return null;

  const result = await dependencies.findSnapshot({
    collection: 'tenant-entitlement-snapshots',
    where: {
      and: [{ tenant: { equals: tenantId } }, { id: { equals: snapshotId } }],
    },
    limit: 1,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  return result.docs[0] ?? null;
}

async function defaultReactivateSellerDependencies(sellerId: number): Promise<ReactivateSellerDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  const now = new Date().toISOString();

  return {
    transactionID,
    now,
    lock,
    lockContext: { transactionID, tenantId: sellerId },
    count: {
      findUsers: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findInvitations: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findProducts: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findVariants: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
    },
    countContext: { transactionID, tenantId: sellerId, now },
    findUserById: async (args) => payload.findByID(args as never) as unknown as Promise<User>,
    updateUser: async (args) => payload.update(args as never) as unknown as Promise<User>,
    findSnapshot: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: TenantEntitlementSnapshot[] }>,
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}
