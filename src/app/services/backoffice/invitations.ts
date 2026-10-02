'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { createInvitation } from '@/app/services/invitations';
import { cacheTags } from '@/lib/cache-tags';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

export interface CreateInvitationResult {
  id: number;
  token: string;
  expiresAt: string;
  emailSent: boolean;
}

export async function createAdminOwnerInvitation(
  name: string | undefined,
  email: string,
  businessName: string | undefined,
): Promise<CreateInvitationResult> {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const adminId = guardedUser.user.id;

  const payload = await (await import('@/lib/payload')).getPayloadClient();
  const existing = await payload.find({
    collection: 'invitations',
    where: {
      and: [{ email: { equals: email } }, { state: { equals: 'pending' } }],
    },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.docs.length > 0) {
    throw new Error('Ya existe una invitación pendiente para este email');
  }

  const invitation = await createInvitation(name ?? '', email, adminId, 'owner', undefined, businessName ?? '');

  await new Promise((resolve) => setTimeout(resolve, 500));
  let emailSent = false;
  try {
    const refetched = await payload.findByID({
      collection: 'invitations',
      id: invitation.id,
      overrideAccess: true,
    });
    emailSent = (refetched as { emailStatus?: string }).emailStatus === 'sent';
  } catch {
    emailSent = false;
  }

  revalidatePath('/backoffice/tenants');
  revalidateTag(cacheTags.adminBackofficeInvitations());

  return {
    id: invitation.id,
    token: invitation.token ?? '',
    expiresAt: invitation.expiresAt ?? '',
    emailSent,
  };
}
