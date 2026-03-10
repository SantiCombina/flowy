import { randomBytes } from 'crypto';

import { render } from '@react-email/render';
import type { CollectionConfig } from 'payload';

import { InvitationEmail } from '@/emails/invitation-email';
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
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return { createdBy: { equals: user.id } };
    },
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
      async ({ data, req, operation }) => {
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
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create') {
          const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000';
          const registerUrl = `${baseUrl}/register?token=${doc.token}`;
          const roleName = doc.role === 'owner' ? 'Dueño' : 'Vendedor';

          try {
            const html = await render(InvitationEmail({ registerUrl, roleName }));
            const { error } = await resend.emails.send({
              from: process.env.EMAIL_FROM || 'Flowy <noreply@Flowy.com>',
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
        beforeChange: [({ req }) => req.user?.id],
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
