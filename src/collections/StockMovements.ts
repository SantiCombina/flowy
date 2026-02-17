import type { CollectionConfig } from 'payload';

export const StockMovements: CollectionConfig = {
  slug: 'stock-movements',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['variant', 'type', 'quantity', 'previousStock', 'newStock', 'createdAt'],
    description: 'Registro de todos los movimientos de inventario',
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
    update: () => false,
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'variant',
      type: 'relationship',
      relationTo: 'product-variants',
      required: true,
      label: 'Variante de producto',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      label: 'Tipo de movimiento',
      options: [
        {
          label: 'Entrada (compra/reposición)',
          value: 'entry',
        },
        {
          label: 'Salida (merma/daño)',
          value: 'exit',
        },
        {
          label: 'Ajuste de inventario',
          value: 'adjustment',
        },
      ],
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      label: 'Cantidad',
      admin: {
        description: 'Cantidad del movimiento (positivo para entrada, negativo para salida)',
      },
    },
    {
      name: 'previousStock',
      type: 'number',
      required: true,
      label: 'Stock anterior',
      admin: {
        readOnly: true,
        description: 'Stock antes del movimiento',
      },
    },
    {
      name: 'newStock',
      type: 'number',
      required: true,
      label: 'Stock nuevo',
      admin: {
        readOnly: true,
        description: 'Stock después del movimiento',
      },
    },
    {
      name: 'reason',
      type: 'textarea',
      label: 'Motivo/Observaciones',
      admin: {
        description: 'Descripción del motivo del movimiento',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Propietario',
      admin: {
        condition: () => false,
      },
      access: {
        update: () => false,
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Registrado por',
      admin: {
        readOnly: true,
        description: 'Usuario que registró el movimiento',
      },
    },
  ],
  timestamps: true,
};
