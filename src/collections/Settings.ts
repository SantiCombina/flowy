import type { CollectionConfig } from 'payload';

import { DEFAULT_COLUMNS, DEFAULT_ITEMS_PER_PAGE, ITEMS_PER_PAGE_OPTIONS } from '../lib/constants/table-columns';

export const Settings: CollectionConfig = {
  slug: 'settings',
  admin: {
    useAsTitle: 'user',
    description: 'Configuración de preferencias del usuario',
  },
  access: {
    create: ({ req: { user } }) => !!user,

    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { user: { equals: user.id } };
    },

    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { user: { equals: user.id } };
    },

    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      admin: {
        description: 'Usuario dueño de esta configuración',
      },
    },

    {
      name: 'productsColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de productos',
      },
      defaultValue: DEFAULT_COLUMNS.products,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'clientsColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de clientes',
      },
      defaultValue: DEFAULT_COLUMNS.clients,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'salesColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de ventas',
      },
      defaultValue: DEFAULT_COLUMNS.sales,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'assignmentsColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de asignaciones',
      },
      defaultValue: DEFAULT_COLUMNS.assignments,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'historyColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de historial',
      },
      defaultValue: DEFAULT_COLUMNS.history,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'sellersColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de vendedores',
      },
      defaultValue: DEFAULT_COLUMNS.sellers,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'budgetsColumns',
      type: 'array',
      admin: {
        description: 'Columnas visibles en la tabla de presupuestos',
      },
      defaultValue: DEFAULT_COLUMNS.budgets,
      fields: [
        {
          name: 'column',
          type: 'text',
          required: true,
        },
      ],
    },

    {
      name: 'itemsPerPage',
      type: 'select',
      defaultValue: DEFAULT_ITEMS_PER_PAGE.toString(),
      options: [
        // '10' is kept only for backward DB compatibility. The UI and application code use 25/50/100.
        { label: '10', value: '10' },
        ...ITEMS_PER_PAGE_OPTIONS.map((value) => ({
          label: value.toString(),
          value: value.toString(),
        })),
      ],
      admin: {
        description: 'Cantidad de elementos por página en las tablas',
      },
    },
  ],

  hooks: {
    beforeChange: [
      ({ req: { user }, data }) => {
        if (user) {
          return {
            ...data,
            user: user.id,
          };
        }
        return data;
      },
    ],
  },
};
