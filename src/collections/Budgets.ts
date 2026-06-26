import type { CollectionConfig, Where } from 'payload';

export const Budgets: CollectionConfig = {
  slug: 'budgets',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['seller', 'client', 'total', 'status', 'date'],
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
      const sellerOwnerId = typeof user.owner === 'number' ? user.owner : user.owner?.id;
      if (sellerOwnerId) {
        const query: Where = { owner: { equals: sellerOwnerId } };
        return query;
      }
      return false;
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') return { owner: { equals: user.id } } as Where;
      if (user.role === 'seller') return { seller: { equals: user.id } } as Where;
      return false;
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') return { owner: { equals: user.id } } as Where;
      if (user.role === 'seller') return { seller: { equals: user.id } } as Where;
      return false;
    },
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
      name: 'clientPhone',
      type: 'text',
      label: 'Teléfono del cliente',
      admin: {
        description: 'Teléfono usado al enviar el presupuesto',
      },
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
      name: 'validUntil',
      type: 'date',
      label: 'Válido hasta',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
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
      ],
    },
    {
      name: 'total',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pendiente', value: 'pending' },
        { label: 'Aprobado', value: 'approved' },
        { label: 'Rechazado', value: 'rejected' },
        { label: 'Convertido', value: 'converted' },
      ],
    },
    {
      name: 'notes',
      type: 'text',
    },
  ],
};
