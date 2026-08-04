import type { CollectionConfig } from 'payload';

import { CAPABILITIES } from '@/lib/entitlements/capabilities';
import {
  assertSnapshotShape,
  assertTrustedWrite,
  isPendingGrantInvitationValid,
  resolveEntitlementNow,
} from '@/lib/entitlements/invariants';

const capabilityFields = (enumName: string) => [
  {
    name: 'capability',
    type: 'select' as const,
    required: true,
    enumName,
    options: CAPABILITIES.map((capability) => ({ label: capability, value: capability })),
  },
];

export const TenantEntitlementSnapshots: CollectionConfig = {
  slug: 'tenant-entitlement-snapshots',
  admin: {
    useAsTitle: 'idempotencyKey',
    defaultColumns: ['tenant', 'sequence', 'kind', 'createdAt'],
  },
  access: {
    create: () => false,
    read: ({ req: { user } }) => user?.role === 'admin',
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, context, operation, req }) => {
        assertTrustedWrite(context, 'Tenant entitlement snapshot assignment');

        if (operation !== 'create') {
          throw new Error('Tenant entitlement snapshots are immutable');
        }

        assertSnapshotShape(data);

        const tenantId = relationshipId(data.tenant, 'Snapshot tenant');
        const tenant = await req.payload.findByID({ collection: 'users', id: tenantId, overrideAccess: true, req });

        if (tenant.role !== 'owner') {
          throw new Error('Snapshot tenant must be an owner');
        }

        if (data.predecessor) {
          const predecessor = await req.payload.findByID({
            collection: 'tenant-entitlement-snapshots',
            id: relationshipId(data.predecessor, 'Snapshot predecessor'),
            overrideAccess: true,
            req,
          });
          if (relationshipId(predecessor.tenant, 'Predecessor tenant') !== tenantId) {
            throw new Error('Snapshot predecessor must belong to the same tenant');
          }
        }

        for (const grant of data.userGrants ?? []) {
          const user = await req.payload.findByID({
            collection: 'users',
            id: relationshipId(grant.user, 'User grant user'),
            overrideAccess: true,
            req,
          });
          const belongsToTenant = user.id === tenantId || relationshipIdOrUndefined(user.owner) === tenantId;
          if (!belongsToTenant) {
            throw new Error('User grant user must belong to the snapshot tenant');
          }
        }

        const pendingGrants = data.pendingGrants ?? [];
        const entitlementNow = pendingGrants.length > 0 ? resolveEntitlementNow(context) : undefined;

        for (const grant of pendingGrants) {
          const invitation = await req.payload.findByID({
            collection: 'invitations',
            id: relationshipId(grant.invitation, 'Pending grant invitation'),
            overrideAccess: true,
            req,
          });
          const isValid = isPendingGrantInvitationValid(
            {
              ...invitation,
              createdBy: relationshipIdOrUndefined(invitation.createdBy),
            },
            tenantId,
            entitlementNow ?? '',
          );
          if (!isValid) {
            throw new Error('Pending grant invitation must be valid for the snapshot tenant');
          }
        }

        return data;
      },
    ],
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'sequence',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'idempotencyKey',
      type: 'text',
      required: true,
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: [
        { label: 'Plan', value: 'plan' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      name: 'planVersion',
      type: 'relationship',
      relationTo: 'plan-versions',
    },
    {
      name: 'pool',
      type: 'array',
      fields: capabilityFields('tes_pool_capability'),
    },
    {
      name: 'userGrants',
      type: 'array',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'capabilities',
          type: 'array',
          fields: capabilityFields('tes_user_grant_capability'),
        },
      ],
    },
    {
      name: 'pendingGrants',
      type: 'array',
      fields: [
        {
          name: 'invitation',
          type: 'relationship',
          relationTo: 'invitations',
          required: true,
        },
        {
          name: 'capabilities',
          type: 'array',
          fields: capabilityFields('tes_pending_grant_capability'),
        },
      ],
    },
    {
      name: 'quotas',
      type: 'group',
      fields: [
        { name: 'maxSellerSeats', type: 'number', min: 0 },
        { name: 'maxProducts', type: 'number', min: 0 },
        { name: 'maxVariantsPerProduct', type: 'number', min: 0 },
        { name: 'maxVariantsPerTenant', type: 'number', min: 0 },
      ],
    },
    {
      name: 'predecessor',
      type: 'relationship',
      relationTo: 'tenant-entitlement-snapshots',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
};

function relationshipId(value: unknown, field: string): number {
  const id = relationshipIdOrUndefined(value);
  if (id === undefined) throw new Error(`${field} is required`);
  return id;
}

function relationshipIdOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') return value.id;
  return undefined;
}
