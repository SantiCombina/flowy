import type { CollectionConfig, Where } from 'payload';

export const Zones: CollectionConfig = {
  slug: 'zones',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner'],
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') {
        const query: Where = { owner: { equals: user.id } };
        return query;
      }
      if (user.role === 'seller') {
        const query: Where = { owner: { equals: typeof user.owner === 'number' ? user.owner : user.owner?.id } };
        return query;
      }
      return false;
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') {
        const query: Where = { owner: { equals: user.id } };
        return query;
      }
      return false;
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') {
        const query: Where = { owner: { equals: user.id } };
        return query;
      }
      return false;
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Nombre de la zona (ej: Zona Norte, Microcentro)',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        condition: () => false,
      },
      filterOptions: () => ({
        role: { equals: 'owner' },
      }),
    },
  ],
};
