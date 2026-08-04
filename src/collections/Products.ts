import type { CollectionConfig } from 'payload';

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'brand', 'category', 'isActive'],
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') {
        return { owner: { equals: user.id } };
      }
      if (user.role === 'seller' && user.owner) {
        return { owner: { equals: user.owner } };
      }
      return false;
    },
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
    delete: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nombre',
    },
    {
      name: 'description',
      type: 'textarea',
      required: false,
      label: 'Descripción',
    },
    {
      name: 'brand',
      type: 'relationship',
      relationTo: 'brands',
      required: false,
      label: 'Marca',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: false,
      label: 'Categoría',
    },
    {
      name: 'quality',
      type: 'relationship',
      relationTo: 'qualities',
      required: false,
      label: 'Calidad',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: false,
      label: 'Imagen',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        condition: () => false,
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'Activo',
      admin: {
        description: 'Desmarcar para ocultar el producto',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ req: { user }, data }) => {
        if (user && !data.owner) {
          return {
            ...data,
            owner: user.id,
          };
        }
        return data;
      },
    ],
  },
};
