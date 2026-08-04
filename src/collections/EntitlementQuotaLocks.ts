import type { CollectionConfig } from 'payload';

import { assertTrustedWrite } from '@/lib/entitlements/invariants';

export const EntitlementQuotaLocks: CollectionConfig = {
  slug: 'entitlement-quota-locks',
  admin: {
    useAsTitle: 'tenant',
    defaultColumns: ['tenant', 'nonce', 'updatedAt'],
  },
  access: {
    create: () => false,
    read: ({ req: { user } }) => user?.role === 'admin',
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ context, data }) => {
        assertTrustedWrite(context, 'Entitlement quota lock mutation');
        return data;
      },
    ],
    beforeDelete: [
      ({ context }) => {
        assertTrustedWrite(context, 'Entitlement quota lock deletion');
      },
    ],
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
    },
    {
      name: 'nonce',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
  ],
};
