import type { CollectionConfig } from 'payload';

export const Presentations: CollectionConfig = {
  slug: 'presentations',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'owner', 'product'],
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { owner: { equals: user.id } };
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') return { owner: { equals: user.id } };
      return false;
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') return { owner: { equals: user.id } };
      return false;
    },
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'Ejemplo: 3kg, 5kg, 10kg',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      admin: {
        description: 'Cantidad numérica',
      },
    },
    {
      name: 'unit',
      type: 'text',
      required: true,
      admin: {
        description: 'Unidad: kg, g, L, ml, etc.',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: false,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        condition: () => false,
      },
    },
  ],
};
