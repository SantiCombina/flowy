import type { CollectionConfig, Where } from 'payload';

import { assertTrustedWrite } from '@/lib/entitlements/invariants';
import { enforceSellerLoginEntitlement } from '@/lib/entitlements/seller-login';

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
  hooks: {
    beforeLogin: [enforceSellerLoginEntitlement],
    beforeChange: [
      async ({ data, context, operation, originalDoc, req }) => {
        if (data && ('activeEntitlementSnapshot' in data || 'entitlementState' in data)) {
          assertTrustedWrite(context, 'User entitlement mutation');
        }

        if (
          operation === 'update' &&
          originalDoc?.role === 'owner' &&
          originalDoc.activeEntitlementSnapshot &&
          data?.role !== undefined &&
          data.role !== 'owner'
        ) {
          throw new Error('An owner with an active entitlement snapshot cannot be demoted');
        }

        if (data?.activeEntitlementSnapshot !== undefined) {
          const userId = operation === 'create' ? recordId(data) : originalDoc?.id;
          const originalIsOwner = operation === 'create' || originalDoc?.role === 'owner';
          const finalRole = data.role ?? originalDoc?.role;

          if (!originalIsOwner || !userId) {
            throw new Error(
              operation === 'update'
                ? 'Only an original owner can hold an entitlement snapshot'
                : 'Only a new owner with an assigned ID can initialize an entitlement snapshot',
            );
          }
          if (finalRole !== 'owner') {
            throw new Error('The final role must remain owner when assigning an entitlement snapshot');
          }
          if (data.activeEntitlementSnapshot === null) {
            if (originalDoc?.activeEntitlementSnapshot) {
              throw new Error('The canonical entitlement snapshot cannot be cleared');
            }
            return data;
          }

          const snapshotId =
            typeof data.activeEntitlementSnapshot === 'number'
              ? data.activeEntitlementSnapshot
              : data.activeEntitlementSnapshot.id;
          const snapshot = await req.payload.findByID({
            collection: 'tenant-entitlement-snapshots',
            id: snapshotId,
            overrideAccess: true,
            req,
          });
          const tenantId = typeof snapshot.tenant === 'number' ? snapshot.tenant : snapshot.tenant.id;

          if (tenantId !== userId) {
            throw new Error('Entitlement snapshots must belong to their owner');
          }
        }

        return data;
      },
    ],
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
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
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
    {
      name: 'activeEntitlementSnapshot',
      type: 'relationship',
      relationTo: 'tenant-entitlement-snapshots',
      index: true,
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        condition: (data) => data?.role === 'owner',
        readOnly: true,
      },
    },
    {
      name: 'entitlementState',
      type: 'select',
      defaultValue: 'provisioning',
      options: [
        { label: 'Provisioning', value: 'provisioning' },
        { label: 'Active', value: 'active' },
        { label: 'Blocked', value: 'blocked' },
      ],
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        condition: (data) => data?.role === 'owner',
        readOnly: true,
      },
    },
  ],
};

function recordId(value: unknown): number | undefined {
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') return value.id;
  return undefined;
}
