'use server';

import { createInvitation } from '@/app/services/invitations';
import {
  dispatchStockToMobileSeller,
  getMobileSellerInventoryForOwner,
  returnStockFromMobileSeller,
} from '@/app/services/mobile-seller';
import { deleteSeller, getSellers, updateSeller } from '@/app/services/users';
import { getCurrentUser } from '@/lib/payload';
import { pusherServer } from '@/lib/pusher-server';
import { actionClient } from '@/lib/safe-action';
import { dispatchStockSchema } from '@/schemas/sellers/dispatch-stock-schema';
import { deleteSellerActionSchema, updateSellerActionSchema } from '@/schemas/sellers/edit-seller-schema';
import { getInventorySchema } from '@/schemas/sellers/inventory-schema';
import { inviteSellerSchema } from '@/schemas/sellers/invite-seller-schema';

export const inviteSellerAction = actionClient.schema(inviteSellerSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const ownerId = user.id;

  await createInvitation(parsedInput.name, parsedInput.email, ownerId);

  try {
    await pusherServer.trigger(`private-owner-${ownerId}`, 'seller_invited', {
      metadata: { userId: ownerId },
    });
  } catch {
    return;
  }

  return { success: true };
});

export const updateSellerAction = actionClient.schema(updateSellerActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const seller = await updateSeller(id, data);

  try {
    await pusherServer.trigger(`private-owner-${user.id}`, 'seller_updated', {
      metadata: { userId: user.id },
    });
  } catch {
    return;
  }

  return { success: true, seller };
});

export const deleteSellerAction = actionClient.schema(deleteSellerActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  await deleteSeller(parsedInput.id);

  try {
    await pusherServer.trigger(`private-owner-${user.id}`, 'seller_deleted', {
      metadata: { userId: user.id },
    });
  } catch {
    return;
  }

  return { success: true };
});

export const dispatchStockAction = actionClient.schema(dispatchStockSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await dispatchStockToMobileSeller(parsedInput.sellerId, user.id, parsedInput.items);

  return { success: true };
});

export const returnStockAction = actionClient.schema(dispatchStockSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await returnStockFromMobileSeller(parsedInput.sellerId, user.id, parsedInput.items);

  return { success: true };
});

export const getSellersAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const sellers = await getSellers(user.id);

  return { success: true, sellers };
});

export const getMobileSellerInventoryAction = actionClient
  .schema(getInventorySchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const items = await getMobileSellerInventoryForOwner(parsedInput.sellerId, user.id);

    return { success: true, items };
  });
