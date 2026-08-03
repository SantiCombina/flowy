import type { CollectionBeforeLoginHook } from 'payload';

import { getPlanCapabilities, resolveEffectiveCapabilities } from '@/lib/entitlements/capabilities';
import { planQuotasFromRow } from '@/lib/entitlements/quotas';
import { resolveId } from '@/lib/payload-utils';
import type { TenantEntitlementSnapshot, User } from '@/payload-types';

type EntitlementState = NonNullable<User['entitlementState']>;

export function sellerHasLoginEntitlement(
  state: EntitlementState,
  snapshot: TenantEntitlementSnapshot | null,
  sellerId: number,
): boolean {
  if (state === 'provisioning') return true;
  if (state === 'blocked' || !snapshot) return false;

  if (snapshot.kind === 'plan') {
    const planVersion = typeof snapshot.planVersion === 'number' ? null : snapshot.planVersion;
    if (!planVersion || planQuotasFromRow(planVersion.quotas).maxSellerSeats === 0) return false;

    const sellerCapabilities = getPlanCapabilities(planVersion.planCode, 'seller');
    return planVersion.capabilities.some(({ capability }) => sellerCapabilities.has(capability));
  }

  if (planQuotasFromRow(snapshot.quotas ?? {}).maxSellerSeats === 0) return false;

  const grant = snapshot.userGrants?.find(({ user }) => resolveId(user) === sellerId);
  const effectiveCapabilities = resolveEffectiveCapabilities({
    kind: 'custom',
    role: 'seller',
    pool: snapshot.pool?.map(({ capability }) => capability) ?? [],
    grant: grant?.capabilities?.map(({ capability }) => capability) ?? [],
  });

  return effectiveCapabilities.size > 0;
}

export const enforceSellerLoginEntitlement: CollectionBeforeLoginHook<User> = async ({ req, user }) => {
  if (user.role !== 'seller') return;

  const ownerId = resolveId(user.owner);
  if (ownerId === null) throw new Error('Seller access is not included in the current plan');

  const owner = await req.payload.findByID({
    collection: 'users',
    id: ownerId,
    depth: 0,
    overrideAccess: true,
    req,
  });

  if (owner.role !== 'owner') throw new Error('Seller access is not included in the current plan');

  const state = owner.entitlementState ?? 'provisioning';
  if (state === 'provisioning') return;

  const snapshotId = resolveId(owner.activeEntitlementSnapshot);
  const snapshot =
    snapshotId === null
      ? null
      : await req.payload.findByID({
          collection: 'tenant-entitlement-snapshots',
          id: snapshotId,
          depth: 2,
          overrideAccess: true,
          req,
        });

  if (snapshot && resolveId(snapshot.tenant) !== owner.id) {
    throw new Error('Seller access is not included in the current plan');
  }

  if (!sellerHasLoginEntitlement(state, snapshot, user.id)) {
    throw new Error('Seller access is not included in the current plan');
  }
};
