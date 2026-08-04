import type { CollectionConfig } from 'payload';

import { assertTrustedWrite } from '@/lib/entitlements/invariants';

export const EntitlementOutbox: CollectionConfig = {
  slug: 'entitlement-outbox',
  admin: {
    useAsTitle: 'idempotencyKey',
    defaultColumns: ['kind', 'aggregate', 'state', 'availableAt'],
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
        assertTrustedWrite(context, 'Entitlement outbox mutation');
        return data;
      },
    ],
    beforeDelete: [
      ({ context }) => {
        assertTrustedWrite(context, 'Entitlement outbox deletion');
      },
    ],
  },
  fields: [
    {
      name: 'idempotencyKey',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'kind',
      type: 'text',
      required: true,
    },
    {
      name: 'aggregate',
      type: 'text',
      required: true,
    },
    {
      name: 'payload',
      type: 'json',
      required: true,
    },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'attempts',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'availableAt',
      type: 'date',
      required: true,
    },
    {
      name: 'claimedAt',
      type: 'date',
    },
    {
      name: 'sentAt',
      type: 'date',
    },
    {
      name: 'lastError',
      type: 'textarea',
    },
  ],
};
