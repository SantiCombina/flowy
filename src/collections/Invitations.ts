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

        if (operation === 'update' && data?.role !== undefined) {
          throw new Error('Invitation role is immutable');
        }

        if (
          operation === 'update' &&
          data &&
          (data.token !== undefined || data.email !== undefined || data.createdBy !== undefined)
        ) {
          throw new Error('Invitation token, creator, and email are immutable');
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
      async ({ doc, req, operation }) => {
        if (operation === 'create') {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
          const registerUrl = `${baseUrl}/register?token=${doc.token}`;
          const roleName = doc.role === 'owner' ? 'Dueño' : 'Vendedor';

          try {
            const html = await render(InvitationEmail({ registerUrl, roleName }));
            const { error } = await resend.emails.send({
              from: `Flowy <${process.env.EMAIL_FROM ?? 'noreply@flowy.ar'}>`,
              to: doc.email,
              subject: 'Invitación a Flowy',
              html,
            });
            if (error) {
              req.payload.logger.error({ err: error, msg: 'Error enviando email de invitación' });
            }
          } catch (error) {
            req.payload.logger.error({ err: error, msg: 'Error enviando email de invitación' });
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
      required: true,
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
  ],
};
