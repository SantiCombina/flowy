import type { CollectionConfig } from 'payload';

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['recipient', 'type', 'title', 'read', 'createdAt'],
  },
  access: {
    create: () => false,
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { recipient: { equals: user.id } };
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { recipient: { equals: user.id } };
    },
    delete: () => false,
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Venta creada', value: 'sale_created' },
        { label: 'Cobro registrado', value: 'payment_registered' },
        { label: 'Stock enviado', value: 'stock_dispatched' },
        { label: 'Stock devuelto', value: 'stock_returned' },
        { label: 'Stock bajo', value: 'stock_low' },
        { label: 'Stock ajustado', value: 'stock_adjusted' },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'text',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
    },
    {
      name: 'read',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'readAt',
      type: 'date',
    },
  ],
  timestamps: true,
};
