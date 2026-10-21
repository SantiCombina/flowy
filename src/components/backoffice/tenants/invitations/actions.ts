'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { createAdminOwnerInvitation } from '@/app/services/backoffice/invitations';
import { listPendingInvitationsByCurrentAdmin, type PendingInvitationRow } from '@/app/services/backoffice/tenants';
import { cacheTags } from '@/lib/cache-tags';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { actionClient } from '@/lib/safe-action';
import { adminInvitationSchema } from '@/schemas/backoffice/admin-invitation-schema';

export const createInvitationAction = actionClient.schema(adminInvitationSchema).action(async ({ parsedInput }) => {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }
  const result = await createAdminOwnerInvitation(
    guardedUser.user.id,
    parsedInput.name,
    parsedInput.email,
    parsedInput.businessName,
  );
  revalidatePath('/backoffice/invitations');
  revalidatePath('/backoffice/tenants');
  revalidateTag(cacheTags.adminBackofficeInvitations());
  return { success: true, ...result };
});

export const listInvitationsAction = actionClient.action(async (): Promise<PendingInvitationRow[]> => {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }
  return listPendingInvitationsByCurrentAdmin();
});
