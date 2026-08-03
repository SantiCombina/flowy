import type { Payload } from 'payload';

import type { EntitlementQuotaLock } from '@/payload-types';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export interface LockDependencies {
  find: (args: unknown) => Promise<{ docs: EntitlementQuotaLock[] }>;
  create: (args: unknown) => Promise<EntitlementQuotaLock>;
  update: (args: unknown) => Promise<EntitlementQuotaLock>;
}

export interface LockContext {
  transactionID: string | number;
  tenantId: number;
}

export async function acquireTenantLock(dependencies: LockDependencies, context: LockContext): Promise<number> {
  const { docs } = await dependencies.find({
    collection: 'entitlement-quota-locks',
    where: { tenant: { equals: context.tenantId } },
    limit: 1,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });

  const existing = docs[0];

  if (existing) {
    const nextNonce = existing.nonce + 1;
    await dependencies.update({
      collection: 'entitlement-quota-locks',
      id: existing.id,
      data: { nonce: nextNonce },
      overrideAccess: true,
      context: { entitlementMutation: true },
      req: { transactionID: context.transactionID },
    });
    return nextNonce;
  }

  const created = await dependencies.create({
    collection: 'entitlement-quota-locks',
    data: { tenant: context.tenantId, nonce: 1 },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: context.transactionID },
  });

  return created.nonce;
}

export async function defaultLockDependencies(): Promise<LockDependencies> {
  const payload = await getPayloadClient();

  return {
    find: async (args) => payload.find(args as never) as unknown as Promise<{ docs: EntitlementQuotaLock[] }>,
    create: async (args) => payload.create(args as never) as unknown as Promise<EntitlementQuotaLock>,
    update: async (args) => payload.update(args as never) as unknown as Promise<EntitlementQuotaLock>,
  };
}

export function buildLockContext(
  payload: Payload,
  transactionID: string | number,
  tenantId: number,
): LockDependencies & { context: LockContext } {
  return {
    context: { transactionID, tenantId },
    find: async (args) => payload.find(args as never) as unknown as Promise<{ docs: EntitlementQuotaLock[] }>,
    create: async (args) => payload.create(args as never) as unknown as Promise<EntitlementQuotaLock>,
    update: async (args) => payload.update(args as never) as unknown as Promise<EntitlementQuotaLock>,
  };
}
