'use server';

import { createInvitation } from '@/app/services/invitations';
import { deleteSeller, updateSeller } from '@/app/services/users';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { deleteSellerActionSchema, updateSellerActionSchema } from '@/schemas/sellers/edit-seller-schema';
import { inviteSellerSchema } from '@/schemas/sellers/invite-seller-schema';

export const inviteSellerAction = actionClient.schema(inviteSellerSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const ownerId = user.role === 'owner' ? user.id : user.id;

  await createInvitation(parsedInput.email, ownerId);

  return { success: true };
});

export const updateSellerAction = actionClient.schema(updateSellerActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const seller = await updateSeller(id, data);

  return { success: true, seller };
});

export const deleteSellerAction = actionClient.schema(deleteSellerActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  await deleteSeller(parsedInput.id);

  return { success: true };
});
