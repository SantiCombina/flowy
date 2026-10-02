import { randomBytes } from 'crypto';

import { render } from '@react-email/render';
import type { CollectionConfig } from 'payload';

import { InvitationEmail } from '@/emails/invitation-email';
import {
  assertInvitationTransition,
  assertTrustedWrite,
  denyInvitationDelete,
  resolveInvitationCreator,
} from '@/lib/entitlements/invariants';
import { resend } from '@/lib/resend';

export const Invitations: CollectionConfig = {
  slug: 'invitations',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'createdBy', 'expiresAt', 'usedAt'],
  },
  access: {
    create: ({ req: { user } }) => {
      if (!user) return false;

      return user.role === 'admin' || user.role === 'owner';
    },
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;

      return { createdBy: { equals: user.id } };
    },
    update: () => false,
    delete: denyInvitationDelete,
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create' && data) {
          data.token = randomBytes(32).toString('hex');

          data.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        }
        return data;
      },
    ],
    beforeChange: [
      async ({ data, req, context, operation, originalDoc }) => {
        if (context?.skipInvitationHooks) return data;

        if (
          data &&
          ('token' in data ||
            'expiresAt' in data ||
            'state' in data ||
            'acceptedUser' in data ||
            'cancelledAt' in data ||
            'replacedAt' in data ||
            'replacedBy' in data ||
            'usedAt' in data)
        ) {
          const isAdminOwnerInitialization =
            operation === 'create' &&
            req.user?.role === 'admin' &&
            data.role === 'owner' &&
            data.state === 'pending' &&
            data.acceptedUser == null &&
            data.usedAt == null &&
            data.cancelledAt == null &&
            data.replacedAt == null &&
            data.replacedBy == null;

          if (!isAdminOwnerInitialization) {
            assertTrustedWrite(context, 'Invitation lifecycle mutation');
          }
          assertInvitationTransition({
            previousState: originalDoc?.state,
            nextState: data.state ?? originalDoc?.state,
            acceptedUser: data.acceptedUser ?? originalDoc?.acceptedUser,
            usedAt: data.usedAt ?? originalDoc?.usedAt,
            cancelledAt: data.cancelledAt ?? originalDoc?.cancelledAt,
            replacedAt: data.replacedAt ?? originalDoc?.replacedAt,
            replacedBy: data.replacedBy ?? originalDoc?.replacedBy,
            expiresAt: data.expiresAt ?? originalDoc?.expiresAt,
            now: new Date().toISOString(),
          });
        }

        if (operation === 'update' && data?.role !== undefined && data.role !== originalDoc?.role) {
          throw new Error('Invitation role is immutable');
        }

        if (
          operation === 'update' &&
          data &&
          ((data.token !== undefined && data.token !== originalDoc?.token) ||
            (data.email !== undefined && data.email !== originalDoc?.email) ||
            (data.createdBy !== undefined && relationshipId(data.createdBy) !== relationshipId(originalDoc?.createdBy)))
        ) {
          throw new Error('Invitation token, creator, and email are immutable');
        }

        if (
          operation === 'update' &&
          data &&
          data.businessName !== undefined &&
          data.businessName !== (originalDoc?.businessName ?? null)
        ) {
          throw new Error('Invitation businessName is immutable');
        }

        if (operation === 'create' && req.user && data) {
          if (req.user.role === 'owner' && data.role !== 'seller') {
            throw new Error('Solo podés invitar vendedores');
          }

          if (req.user.role === 'admin' && data.role === 'seller') {
            throw new Error('Admins solo invitan owners');
          }
        }
        return data;
      },
    ],
    beforeDelete: [
      () => {
        throw new Error('Invitation hard deletion is denied');
      },
    ],
    afterChange: [
      async ({ doc, req, operation, context }) => {
        if (context?.skipInvitationHooks) return doc;
        if (operation === 'create') {
          const host = req.headers.get('host') ?? 'localhost:3000';
          const baseUrl = `${req.protocol}://${host}`;
          let registerUrl = `${baseUrl}/register?token=${doc.token}`;
          if (doc.role === 'owner' && doc.businessName) {
            registerUrl += `&businessName=${encodeURIComponent(doc.businessName)}`;
          }
          const roleName = doc.role === 'owner' ? 'Dueño' : 'Vendedor';

          let emailStatus: 'sent' | 'failed' = 'failed';

          try {
            const html = await render(InvitationEmail({ registerUrl, roleName }));
            const { error } = await resend.emails.send({
              from: `Flowy <${process.env.EMAIL_FROM ?? 'noreply@flowy.ar'}>`,
              to: doc.email,
              subject: 'Invitación a Flowy',
              html,
            });
            if (error) {
              req.payload.logger.error({
                err: error,
                msg: 'Error enviando email de invitación',
              });
              emailStatus = 'failed';
            } else {
              emailStatus = 'sent';
            }
          } catch (error) {
            req.payload.logger.error({
              err: error,
              msg: 'Error enviando email de invitación',
            });
            emailStatus = 'failed';
          }

          try {
            const updated = await req.payload.update({
              collection: 'invitations',
              id: doc.id,
              data: { emailStatus } as never,
              overrideAccess: true,
              context: { ...req.context, skipInvitationHooks: true },
              req,
            });
            if (!updated) {
              req.payload.logger.error({
                msg: 'No se pudo actualizar emailStatus de la invitación',
              });
            }
          } catch (error) {
            req.payload.logger.error({
              err: error,
              msg: 'Error actualizando emailStatus de la invitación',
            });
          }
        }
        return doc;
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'businessName',
      type: 'text',
      admin: {
        description: 'Nombre del negocio para el nuevo owner',
        condition: (data) => data?.role === 'owner',
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        { label: 'Dueño', value: 'owner' },
        { label: 'Vendedor', value: 'seller' },
      ],
    },
    {
      name: 'token',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [({ req, value, context }) => resolveInvitationCreator(value, req.user?.id, context)],
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Replaced', value: 'replaced' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'acceptedUser',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'cancelledAt',
      type: 'date',
    },
    {
      name: 'replacedAt',
      type: 'date',
    },
    {
      name: 'replacedBy',
      type: 'relationship',
      relationTo: 'invitations',
    },
    {
      name: 'usedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Fecha en que se usó la invitación',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'emailStatus',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
      ],
    },
  ],
};

function relationshipId(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') return value.id;
  return undefined;
}
