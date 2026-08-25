import type { CollectionConfig, Where } from 'payload';

import { assertTrustedWrite } from '@/lib/entitlements/invariants';

export const Sales: CollectionConfig = {
  slug: 'sales',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['seller', 'client', 'total', 'paymentMethod', 'date'],
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'admin',
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') {
        const query: Where = { owner: { equals: user.id } };
        return query;
      }
      const query: Where = { seller: { equals: user.id } };
      return query;
    },
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data, context, operation, originalDoc }) => {
        if (data && 'sourceBudget' in data) {
          const nextBudgetId = relationshipId(data.sourceBudget);
          const originalBudgetId = relationshipId(originalDoc?.sourceBudget);

          if (nextBudgetId === undefined) {
            if (operation === 'update' && originalBudgetId !== undefined) {
              throw new Error('Sale sourceBudget cannot be cleared');
            }
            return data;
          }
          assertTrustedWrite(context, 'Sale budget conversion');
          if (operation === 'update' && originalBudgetId !== undefined && originalBudgetId !== nextBudgetId) {
            throw new Error('Sale sourceBudget is immutable');
          }
        }
        return data;
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const sale = await req.payload.findByID({
          collection: 'sales',
          id,
          overrideAccess: true,
          req,
        });

        if (sale.sourceBudget) {
          throw new Error('A budget-derived sale cannot be deleted');
        }
      },
    ],
  },
  fields: [
    {
      name: 'seller',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
    },
    {
      name: 'sourceBudget',
      type: 'relationship',
      relationTo: 'budgets',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      index: true,
      options: [
        { label: 'Efectivo', value: 'cash' },
        { label: 'Transferencia', value: 'transfer' },
        { label: 'Cheque', value: 'check' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'variant',
          type: 'relationship',
          relationTo: 'product-variants',
          required: true,
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'unitPrice',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'stockSource',
          type: 'select',
          required: true,
          options: [
            { label: 'Depósito', value: 'warehouse' },
            { label: 'Mi inventario', value: 'personal' },
          ],
        },
      ],
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'amountPaid',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: 'Monto cobrado',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'notes',
      type: 'text',
    },
    {
      name: 'paymentStatus',
      type: 'select',
      required: true,
      index: true,
      label: 'Estado de cobro',
      defaultValue: 'pending',
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Parcialmente cobrado', value: 'partially_collected' },
        { label: 'Cobrado', value: 'collected' },
      ],
    },
    {
      name: 'collectedAt',
      type: 'date',
      label: 'Cobrado el',
      admin: {
        condition: (data) => data?.paymentStatus === 'collected' || data?.paymentStatus === 'partially_collected',
      },
    },
    {
      name: 'checkDueDate',
      type: 'date',
      label: 'Fecha de cobro del cheque',
      admin: {
        condition: (data) => data?.paymentMethod === 'check',
      },
    },
    {
      name: 'deliveryStatus',
      type: 'select',
      required: true,
      index: true,
      label: 'Estado de entrega',
      defaultValue: 'pending',
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Entregado', value: 'delivered' },
      ],
    },
    {
      name: 'deliveredAt',
      type: 'date',
      label: 'Entregado el',
      admin: {
        condition: (data) => data?.deliveryStatus === 'delivered',
      },
    },
  ],
};

function relationshipId(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') return value.id;
  return undefined;
}
