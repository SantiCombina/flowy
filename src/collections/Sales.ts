import type { CollectionConfig, Where } from 'payload';

export const Sales: CollectionConfig = {
  slug: 'sales',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['seller', 'client', 'total', 'paymentMethod', 'date'],
  },
  access: {
    create: ({ req: { user } }) => {
      if (!user) return false;
      return user.role === 'admin' || user.role === 'owner' || user.role === 'seller';
    },
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
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
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
      label: 'Estado de cobro (vendedor)',
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
      label: 'Cobrado el (vendedor)',
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
      name: 'ownerPaymentStatus',
      type: 'select',
      required: true,
      label: 'Estado de cobro (owner)',
      defaultValue: 'pending',
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Parcialmente cobrado', value: 'partially_collected' },
        { label: 'Cobrado', value: 'collected' },
      ],
    },
    {
      name: 'ownerAmountPaid',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: 'Monto cobrado (owner)',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'ownerCollectedAt',
      type: 'date',
      label: 'Cobrado el (owner)',
      admin: {
        condition: (data) =>
          data?.ownerPaymentStatus === 'collected' || data?.ownerPaymentStatus === 'partially_collected',
      },
    },
  ],
};
