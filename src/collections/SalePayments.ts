import type { CollectionConfig, Where } from 'payload';

export const SalePayments: CollectionConfig = {
  slug: 'sale-payments',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['sale', 'amount', 'date', 'paymentMethod', 'createdAt'],
    description: 'Cobros registrados de ventas',
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'admin',
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
    update: ({ req: { user } }) => user?.role === 'admin',
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    { name: 'sale', type: 'relationship', relationTo: 'sales', required: true, index: true, label: 'Venta' },
    { name: 'seller', type: 'relationship', relationTo: 'users', required: true, index: true, label: 'Vendedor' },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      label: 'Propietario',
      admin: { condition: () => false },
    },
    { name: 'amount', type: 'number', required: true, min: 0.01, label: 'Monto' },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true,
      label: 'Fecha de cobro',
      admin: { date: { pickerAppearance: 'dayOnly' } },
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
    { name: 'checkDueDate', type: 'date', label: 'Fecha de cobro del cheque' },
    {
      name: 'registeredBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Registrado por',
      admin: { condition: () => false },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'live',
      label: 'Origen',
      options: [
        { label: 'Registro normal', value: 'live' },
        { label: 'Migración histórica', value: 'legacy' },
      ],
      admin: { condition: () => false },
    },
  ],
  timestamps: true,
};
