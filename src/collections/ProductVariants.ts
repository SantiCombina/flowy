import type { CollectionConfig } from 'payload';

export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'product', 'presentation', 'stock', 'costPrice', 'profitMargin'],
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
      name: 'code',
      type: 'text',
      required: false,
      label: 'Código',
      admin: {
        description: 'Código único del producto con esta presentación (opcional)',
      },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      label: 'Producto',
    },
    {
      name: 'presentation',
      type: 'relationship',
      relationTo: 'presentations',
      required: false,
      label: 'Presentación',
    },
    {
      name: 'stock',
      type: 'number',
      required: true,
      defaultValue: 0,
      label: 'Stock actual',
      admin: {
        description: 'Cantidad disponible en inventario',
      },
    },
    {
      name: 'costPrice',
      type: 'number',
      required: true,
      label: 'Precio de costo',
      admin: {
        description: 'Costo de adquisición de esta presentación',
      },
    },
    {
      name: 'profitMargin',
      type: 'number',
      required: false,
      defaultValue: 0,
      label: 'Margen de ganancia (%)',
      admin: {
        description: 'Porcentaje de ganancia sobre el costo (ej: 20 = 20%)',
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
    },
  ],
  hooks: {
    beforeChange: [
      async ({ req: { user, payload }, data }) => {
        if (user && !data.owner) {
          if (data.product) {
            try {
              const product = await payload.findByID({
                collection: 'products',
                id: data.product,
              });
              if (product && product.owner) {
                return {
                  ...data,
                  owner: product.owner,
                };
              }
            } catch {}
          }
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
