'use server';

import type { Where } from 'payload';

import { assertInvitationTransition } from '@/lib/entitlements/invariants';
import { buildInvitationCreateData, isInvitationUsable } from '@/lib/entitlements/invitation-boundary';
import { hasPendingOwnerInvitation, lockInvitation, lockInvitationEmail } from '@/lib/invitation-locks';
import { getPayloadClient } from '@/lib/payload';
import type { Invitation } from '@/payload-types';
import type { InvitationListValues } from '@/schemas/backoffice/invitation-list-schema';

export interface CreateInvitationResult {
  id: number;
  token: string;
  expiresAt: string;
  emailSent: boolean;
}

export interface InvitationRow {
  id: number;
  name: string | null;
  email: string;
  businessName: string | null;
  state: Invitation['state'];
  emailStatus: Invitation['emailStatus'];
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  cancelledAt: string | null;
}

export interface InvitationListResult {
  docs: InvitationRow[];
  totalDocs: number;
  totalPages: number;
  page: number;
}

export async function listAdminOwnerInvitations(input: InvitationListValues): Promise<InvitationListResult> {
  const payload = await getPayloadClient();
  const now = new Date().toISOString();
  const and: Where[] = [{ role: { equals: 'owner' } }];
  if (input.search) {
    and.push({ or: ['name', 'email', 'businessName'].map((field) => ({ [field]: { like: input.search } })) });
  }
  if (input.state === 'pending') {
    and.push({ state: { equals: 'pending' } }, { expiresAt: { greater_than: now } });
  } else if (input.state === 'expired') {
    and.push({
      or: [
        { state: { equals: 'expired' } },
        { and: [{ state: { equals: 'pending' } }, { expiresAt: { less_than_equal: now } }] },
      ],
    });
  } else if (input.state !== 'all') {
    and.push({ state: { equals: input.state } });
  }
  async function findPage(page: number) {
    return payload.find({
      collection: 'invitations',
      where: { and },
      depth: 0,
      limit: 25,
      page,
      sort: ['-createdAt', '-id'],
      overrideAccess: true,
      select: {
        name: true,
        email: true,
        businessName: true,
        state: true,
        emailStatus: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        cancelledAt: true,
      },
    });
  }
  let result = await findPage(input.page);
  const page = Math.min(input.page, Math.max(1, result.totalPages));
  if (page !== input.page) result = await findPage(page);
  return {
    docs: result.docs.map((invitation) => ({
      id: invitation.id,
      name: invitation.name ?? null,
      email: invitation.email,
      businessName: invitation.businessName ?? null,
      state:
        invitation.state === 'pending' && invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.parse(now)
          ? 'expired'
          : invitation.state,
      emailStatus: invitation.emailStatus,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt ?? null,
      usedAt: invitation.usedAt ?? null,
      cancelledAt: invitation.cancelledAt ?? null,
    })),
    totalDocs: result.totalDocs,
    totalPages: Math.max(1, result.totalPages),
    page,
  };
}

export async function createAdminOwnerInvitation(
  adminId: number,
  name: string | undefined,
  email: string,
  businessName: string | undefined,
): Promise<CreateInvitationResult> {
  const payload = await getPayloadClient();
  const normalizedEmail = email.trim().toLowerCase();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) throw new Error('No se pudo iniciar la transacción de base de datos');
  const req = { transactionID };
  try {
    await lockInvitationEmail(payload.db.sessions, transactionID, normalizedEmail);
    const existing = await hasPendingOwnerInvitation(
      payload.db.sessions,
      transactionID,
      normalizedEmail,
      new Date().toISOString(),
    );
    if (existing) throw new Error('Ya existe una invitación pendiente para este email');
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: normalizedEmail } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    });
    if (users.docs.length) throw new Error('El email ya está registrado');
    const invitation = await payload.create({
      collection: 'invitations',
      data: buildInvitationCreateData(name ?? '', normalizedEmail, businessName ?? '', 'owner', adminId),
      overrideAccess: true,
      context: { entitlementMutation: true },
      req,
    });
    const updated = await payload.findByID({ collection: 'invitations', id: invitation.id, overrideAccess: true, req });
    await payload.db.commitTransaction(transactionID);
    return {
      id: invitation.id,
      token: invitation.token ?? '',
      expiresAt: invitation.expiresAt ?? '',
      emailSent: updated.emailStatus === 'sent',
    };
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }
}

export async function cancelAdminOwnerInvitation(id: number): Promise<void> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) throw new Error('No se pudo iniciar la transacción de base de datos');
  const req = { transactionID };
  try {
    const original = await payload.findByID({ collection: 'invitations', id, depth: 0, overrideAccess: true, req });
    if (original.role !== 'owner' || !original.token) throw new Error('Invitación no disponible');
    await lockInvitation(payload.db.sessions, transactionID, original.token);
    const invitation = await payload.findByID({ collection: 'invitations', id, depth: 0, overrideAccess: true, req });
    if (invitation.state !== 'cancelled') {
      const now = new Date().toISOString();
      if (!isInvitationUsable(invitation, now)) {
        throw new Error('Solo se pueden cancelar invitaciones pendientes y vigentes');
      }
      await payload.update({
        collection: 'invitations',
        id,
        data: { state: 'cancelled', cancelledAt: now },
        overrideAccess: true,
        context: { entitlementMutation: true },
        req,
      });
    }
    await payload.db.commitTransaction(transactionID);
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }
}

export async function renewAdminOwnerInvitation(adminId: number, id: number) {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) throw new Error('No se pudo iniciar la transacción de base de datos');
  const req = { transactionID };
  try {
    const original = await payload.findByID({ collection: 'invitations', id, depth: 0, overrideAccess: true, req });
    if (original.role !== 'owner' || !original.token) throw new Error('Invitación no disponible');
    const email = original.email.trim().toLowerCase();
    await lockInvitationEmail(payload.db.sessions, transactionID, email);
    await lockInvitation(payload.db.sessions, transactionID, original.token);
    const invitation = await payload.findByID({ collection: 'invitations', id, depth: 0, overrideAccess: true, req });
    if (
      !['pending', 'expired'].includes(invitation.state) ||
      invitation.usedAt ||
      invitation.acceptedUser ||
      invitation.cancelledAt ||
      invitation.replacedAt ||
      invitation.replacedBy
    )
      throw new Error('Solo se pueden reenviar invitaciones pendientes o vencidas');
    const now = new Date().toISOString();
    if (await hasPendingOwnerInvitation(payload.db.sessions, transactionID, email, now, id)) {
      throw new Error('Ya existe otra invitación pendiente para este email. Actualizá el listado.');
    }
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    });
    if (users.docs.length) throw new Error('El email ya está registrado');
    assertInvitationTransition({ nextState: 'pending' });
    const renewed = await payload.create({
      collection: 'invitations',
      data: buildInvitationCreateData(invitation.name ?? '', email, invitation.businessName ?? '', 'owner', adminId),
      overrideAccess: true,
      context: { entitlementMutation: true, skipInvitationHooks: true },
      req,
    });
    if (!renewed.token || !renewed.expiresAt) throw new Error('No se pudo generar el nuevo enlace');
    if (invitation.state === 'pending') {
      await payload.update({
        collection: 'invitations',
        id,
        data: { state: 'replaced', replacedAt: now, replacedBy: renewed.id },
        overrideAccess: true,
        context: { entitlementMutation: true, skipInvitationHooks: false },
        req,
      });
    }
    await payload.db.commitTransaction(transactionID);
    return {
      id: renewed.id,
      token: renewed.token,
      email: renewed.email,
      businessName: renewed.businessName ?? null,
    };
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID);
    throw error;
  }
}

export async function recordAdminInvitationEmailStatus(id: number, emailStatus: 'sent' | 'failed'): Promise<void> {
  const payload = await getPayloadClient();
  await payload.update({
    collection: 'invitations',
    id,
    data: { emailStatus },
    overrideAccess: true,
    context: { entitlementMutation: true },
  });
}
