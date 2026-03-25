import type { CollectionConfig } from 'payload';

export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    useAsTitle: 'endpoint',
    defaultColumns: ['user', 'endpoint', 'createdAt'],
  },
  access: {
    create: ({ req: { user } }) => !!user,
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { user: { equals: user.id } };
    },
    update: () => false,
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { user: { equals: user.id } };
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
    },
    {
      name: 'p256dh',
      type: 'text',
      required: true,
    },
    {
      name: 'auth',
      type: 'text',
      required: true,
    },
  ],
  timestamps: true,
};
