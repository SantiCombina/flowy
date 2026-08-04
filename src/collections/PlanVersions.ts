import type { CollectionConfig } from 'payload';

import { CAPABILITIES } from '@/lib/entitlements/capabilities';
import { assertCapabilityRows, assertTrustedWrite } from '@/lib/entitlements/invariants';

export const PlanVersions: CollectionConfig = {
  slug: 'plan-versions',
  admin: {
    useAsTitle: 'planCode',
    defaultColumns: ['planCode', 'version', 'publishedAt'],
  },
  access: {
    create: () => false,
    read: ({ req: { user } }) => user?.role === 'admin',
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      ({ data, context, operation }) => {
        assertTrustedWrite(context, 'Plan version publication');

        if (operation !== 'create') {
          throw new Error('Plan versions are immutable');
        }

        assertCapabilityRows(data.capabilities);
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'planCode',
      type: 'select',
      required: true,
      options: [
        { label: 'Basic', value: 'basic' },
        { label: 'Medium', value: 'medium' },
        { label: 'Professional', value: 'professional' },
      ],
    },
    {
      name: 'version',
      type: 'number',
      required: true,
      min: 1,
    },
    {
      name: 'capabilities',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'capability',
          type: 'select',
          required: true,
          options: CAPABILITIES.map((capability) => ({ label: capability, value: capability })),
        },
      ],
    },
    {
      name: 'quotas',
      type: 'group',
      required: true,
      fields: [
        { name: 'maxSellerSeats', type: 'number', required: true, min: 0 },
        { name: 'maxProducts', type: 'number', required: true, min: 0 },
        { name: 'maxVariantsPerProduct', type: 'number', required: true, min: 0 },
        { name: 'maxVariantsPerTenant', type: 'number', required: true, min: 0 },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
};
