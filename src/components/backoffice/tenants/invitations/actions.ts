'use server';

import { createAdminOwnerInvitation, type CreateInvitationResult } from '@/app/services/backoffice/invitations';
import { listPendingInvitationsByCurrentAdmin, type PendingInvitationRow } from '@/app/services/backoffice/tenants';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { actionClient } from '@/lib/safe-action';
import { adminInvitationSchema } from '@/schemas/backoffice/admin-invitation-schema';

export const createInvitationAction = actionClient
  .schema(adminInvitationSchema)
  .action(async ({ parsedInput }): Promise<CreateInvitationResult> => {
    const guardedUser = await getCurrentUserWithCapabilities();
    if (!guardedUser || guardedUser.user.role !== 'admin') {
      throw new Error('No autorizado');
    }
    return createAdminOwnerInvitation(parsedInput.name, parsedInput.email, parsedInput.businessName);
  });

export const listInvitationsAction = actionClient.action(async (): Promise<PendingInvitationRow[]> => {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }
  return listPendingInvitationsByCurrentAdmin();
});
