import type { TenantEntitlementSnapshot } from '@/payload-types';

export interface IdempotencyDependencies {
  findSnapshots(args: unknown): Promise<{ docs: TenantEntitlementSnapshot[] }>;
}

export interface IdempotencyContext {
  tenantId: number;
  transactionID: string | number;
}

export function generateIdempotencyKey(prefix: string, tenantId: number | string, discriminator: string): string {
  return `${prefix}:${tenantId}:${discriminator}`;
}

export async function findExistingSnapshotByIdempotencyKey(
  dependencies: IdempotencyDependencies,
  context: IdempotencyContext,
  idempotencyKey: string,
): Promise<TenantEntitlementSnapshot | null> {
  const result = await dependencies.findSnapshots({
    collection: 'tenant-entitlement-snapshots',
    where: {
      and: [{ tenant: { equals: context.tenantId } }, { idempotencyKey: { equals: idempotencyKey } }],
    },
    limit: 1,
    overrideAccess: true,
    req: { transactionID: context.transactionID },
  });

  return result.docs[0] ?? null;
}

export function generateSnapshotIdempotencyKey(tenantId: number, planVersionId: number, sequence: number): string {
  return generateIdempotencyKey('snapshot', tenantId, `${planVersionId}:${sequence}`);
}
