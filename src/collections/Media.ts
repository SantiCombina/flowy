import type { CollectionConfig, Where } from 'payload';

import { assertTrustedWrite, isTrustedEntitlementContext } from '@/lib/entitlements/invariants';

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: ({ req: { user } }) => user?.role === 'owner' || user?.role === 'seller',
    read: ({ req: { user } }) => mediaTenantAccess(user),
    update: ({ req: { user } }) => mediaTenantMutationAccess(user),
    delete: ({ req: { user } }) => mediaTenantMutationAccess(user),
  },
  hooks: {
    beforeChange: [
      async ({ data, context, operation, originalDoc, req }) => {
        const hasLifecycleMetadata =
          data &&
          ('uploadRequestId' in data ||
            'stagedAt' in data ||
            'claimedAt' in data ||
            'claimedByProduct' in data ||
            'cleanupAfter' in data);
        const hasExplicitTenantMutation = data && 'tenant' in data && operation !== 'create';

        if (hasLifecycleMetadata || hasExplicitTenantMutation) {
          assertTrustedWrite(context, 'Media lifecycle mutation');
        }

        if (hasExplicitTenantMutation) {
          throw new Error('Media tenant is immutable');
        }

        let tenantId: number | undefined;
        if (operation === 'create' && data) {
          if (isTrustedEntitlementContext(context)) {
            tenantId = relationshipId(data.tenant);
            if (!tenantId) {
              throw new Error('Trusted media creation requires tenant');
            }
            const tenant = await req.payload.findByID({
              collection: 'users',
              id: tenantId,
              overrideAccess: true,
              req,
            });
            if (tenant.role !== 'owner') {
              throw new Error('Media tenant must be an owner');
            }
          } else {
            tenantId = mediaTenantId(req.user);
            if (!tenantId) {
              throw new Error('Media uploads require an authenticated tenant');
            }
          }
          data.tenant = tenantId;
        } else {
          tenantId = relationshipId(originalDoc?.tenant);
        }

        if (data?.claimedByProduct !== undefined) {
          if (!tenantId) {
            throw new Error('Claimed media requires tenant');
          }
          const product = await req.payload.findByID({
            collection: 'products',
            id: requiredRelationshipId(data.claimedByProduct, 'Claimed media product'),
            overrideAccess: true,
            req,
          });
          if (relationshipId(product.owner) !== tenantId) {
            throw new Error('Claimed product must belong to the media tenant');
          }
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'users',
      index: true,
    },
    {
      name: 'uploadRequestId',
      type: 'text',
    },
    {
      name: 'stagedAt',
      type: 'date',
    },
    {
      name: 'claimedAt',
      type: 'date',
    },
    {
      name: 'claimedByProduct',
      type: 'relationship',
      relationTo: 'products',
    },
    {
      name: 'cleanupAfter',
      type: 'date',
      index: true,
    },
  ],
  upload: true,
};

function mediaTenantAccess(
  user: { id: number; owner?: number | { id: number } | null; role?: string } | null | undefined,
): boolean | Where {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const tenantId = mediaTenantId(user);
  if (!tenantId) return false;
  return { tenant: { equals: tenantId } };
}

function mediaTenantMutationAccess(
  user: { id: number; owner?: number | { id: number } | null; role?: string } | null | undefined,
): boolean | Where {
  if (!user || user.role === 'admin') return false;
  return mediaTenantAccess(user);
}

function mediaTenantId(
  user: { id: number; owner?: number | { id: number } | null; role?: string } | null | undefined,
): number | undefined {
  if (!user) return undefined;
  if (user.role === 'owner') return user.id;
  if (user.role !== 'seller') return undefined;
  if (typeof user.owner === 'number') return user.owner;
  return user.owner?.id;
}

function relationshipId(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') return value.id;
  return undefined;
}

function requiredRelationshipId(value: unknown, field: string): number {
  const id = relationshipId(value);
  if (id === undefined) throw new Error(`${field} is required`);
  return id;
}
