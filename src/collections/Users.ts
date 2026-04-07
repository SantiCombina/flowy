import type { CollectionConfig, Where } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role', 'isActive'],
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    forgotPassword: {
      generateEmailHTML: async (args) => {
        const token = args?.token;
        const { render } = await import('@react-email/render');
        const { ResetPasswordEmail } = await import('@/emails/reset-password-email');
        const resetUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/reset-password?token=${token ?? ''}`;
        return render(ResetPasswordEmail({ resetUrl }));
      },
      generateEmailSubject: () => 'Recuperá tu contraseña — Flowy',
    },
  },
  access: {
    create: ({ req: { user } }) => user?.role === 'admin',
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'owner') {
        const query: Where = {
          or: [{ id: { equals: user.id } }, { owner: { equals: user.id } }],
        };
        return query;
      }

      const query: Where = { id: { equals: user.id } };
      return query;
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;

      const query: Where = { id: { equals: user.id } };
      return query;
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'seller',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Dueño', value: 'owner' },
        { label: 'Vendedor', value: 'seller' },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
      saveToJWT: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',

      admin: {
        condition: (data) => data?.role === 'seller',
        description: 'El dueño al que pertenece este vendedor',
      },
      filterOptions: () => ({
        role: { equals: 'owner' },
      }),
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Si está desactivado, el usuario no puede iniciar sesión',
      },
    },
    {
      name: 'isDeleted',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Indica si el vendedor fue eliminado por el owner',
      },
    },
    {
      name: 'phone',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'seller',
        description: 'Número de teléfono del vendedor',
      },
    },
    {
      name: 'dni',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'seller',
        description: 'Documento Nacional de Identidad',
      },
    },
    {
      name: 'cuitCuil',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'seller',
        description: 'CUIT/CUIL del vendedor',
      },
    },
    {
      name: 'cbu',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'seller',
        description: 'Clave Bancaria Uniforme para pagos',
      },
    },
    {
      name: 'businessName',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'owner',
        description: 'Nombre del negocio visible en el sidebar',
      },
    },
    {
      name: 'businessCuit',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'owner',
        description: 'CUIT de la empresa (XX-XXXXXXXX-X)',
      },
    },
    {
      name: 'businessPhone',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'owner',
        description: 'Teléfono comercial del negocio',
      },
    },
    {
      name: 'businessAddress',
      type: 'text',
      admin: {
        condition: (data) => data?.role === 'owner',
        description: 'Domicilio fiscal de la empresa',
      },
    },
    {
      name: 'ivaCondition',
      type: 'select',
      options: [
        { label: 'Responsable Inscripto', value: 'responsable_inscripto' },
        { label: 'Monotributista', value: 'monotributista' },
        { label: 'Exento', value: 'exento' },
        { label: 'No Responsable', value: 'no_responsable' },
      ],
      admin: {
        condition: (data) => data?.role === 'owner',
        description: 'Condición ante IVA',
      },
    },
  ],
};
