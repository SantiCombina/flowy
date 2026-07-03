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
        { label: 'Venta eliminada', value: 'sale_deleted' },
        { label: 'Venta editada', value: 'sale_edited' },
        { label: 'Cobro registrado', value: 'payment_registered' },
        { label: 'Stock enviado', value: 'stock_dispatched' },
        { label: 'Stock devuelto', value: 'stock_returned' },
        { label: 'Stock bajo', value: 'stock_low' },
        { label: 'Stock ajustado', value: 'stock_adjusted' },
        { label: 'Presupuesto creado', value: 'budget_created' },
        { label: 'Presupuesto editado', value: 'budget_updated' },
        { label: 'Presupuesto eliminado', value: 'budget_deleted' },
        { label: 'Presupuesto convertido', value: 'budget_converted' },
        { label: 'Producto creado', value: 'product_created' },
        { label: 'Producto editado', value: 'product_updated' },
        { label: 'Producto eliminado', value: 'product_deleted' },
        { label: 'Variante creada', value: 'variant_created' },
        { label: 'Variante editada', value: 'variant_updated' },
        { label: 'Variante eliminada', value: 'variant_deleted' },
        { label: 'Vendedor invitado', value: 'seller_invited' },
        { label: 'Vendedor editado', value: 'seller_updated' },
        { label: 'Vendedor eliminado', value: 'seller_deleted' },
        { label: 'Comisión pagada', value: 'commission_paid' },
        { label: 'Cliente creado', value: 'client_created' },
        { label: 'Cliente editado', value: 'client_updated' },
        { label: 'Cliente eliminado', value: 'client_deleted' },
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
