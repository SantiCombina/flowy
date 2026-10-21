import type { Payload, PayloadRequest } from 'payload';

import { resolveId } from '@/lib/payload-utils';
import type { User } from '@/payload-types';

export async function hasTenantAccess(payload: Payload, user: User, req?: Partial<PayloadRequest>): Promise<boolean> {
  if (user.isActive === false || user.isDeleted) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'owner') return user.entitlementState !== 'blocked';

  const ownerId = resolveId(user.owner);
  if (ownerId === null) return false;

  const owner = await payload.findByID({
    collection: 'users',
    id: ownerId,
    depth: 0,
    overrideAccess: true,
    req,
    disableErrors: true,
  });

  return Boolean(
    owner &&
      owner.role === 'owner' &&
      owner.isActive !== false &&
      !owner.isDeleted &&
      owner.entitlementState !== 'blocked',
  );
}

export function enforceTenantAuthentication(payload: Payload): void {
  payload.authStrategies = payload.authStrategies.map((strategy) => ({
    ...strategy,
    authenticate: async (args) => {
      const result = await strategy.authenticate(args);
      if (!result.user || result.user.collection !== 'users') return result;
      if (await hasTenantAccess(payload, result.user)) return result;
      return { ...result, user: null };
    },
  }));
}
