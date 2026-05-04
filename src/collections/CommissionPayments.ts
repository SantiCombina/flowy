import type { CollectionConfig, Where } from 'payload';

export const CommissionPayments: CollectionConfig = {
  slug: 'commission-payments',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['seller', 'amount', 'date', 'paymentMethod', 'createdAt'],
    description: 'Pagos de comisiones a vendedores',
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
        const query: Where = { seller: { equals: user.id } };
        return query;
      }
      return false;
    },
    update: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
    delete: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'owner',
  },
  fields: [
    {
      name: 'seller',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Vendedor',
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
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0.01,
      label: 'Monto',
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      label: 'Fecha',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      label: 'Método de pago',
      options: [
        { label: 'Transferencia', value: 'transfer' },
        { label: 'Efectivo', value: 'cash' },
        { label: 'Cheque', value: 'check' },
      ],
    },
    {
      name: 'reference',
      type: 'text',
      label: 'Referencia',
      admin: {
        description: 'Número de transferencia, comprobante, etc.',
      },
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'Notas',
    },
  ],
  timestamps: true,
};
