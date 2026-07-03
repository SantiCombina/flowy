'use server';

import {
  changePassword,
  getOwnerById,
  getSellers,
  loginUser as loginUserService,
  updateSeller,
} from '@/app/services/users';
import { getCurrentUser } from '@/lib/payload';
import { pusherServer } from '@/lib/pusher-server';
import { actionClient } from '@/lib/safe-action';
import { changePasswordSchema } from '@/schemas/profile/change-password-schema';
import { updateBusinessDataSchema } from '@/schemas/profile/update-business-data-schema';
import { updateBusinessNameSchema } from '@/schemas/profile/update-business-name-schema';
import { updateProfileSchema } from '@/schemas/profile/update-profile-schema';

export const changePasswordAction = actionClient.schema(changePasswordSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user) throw new Error('No autenticado');

  const loginResult = await loginUserService({
    email: user.email,
    password: parsedInput.currentPassword,
  });

  if (!loginResult.success) {
    return { error: 'La contraseña actual es incorrecta.' };
  }

  await changePassword(user.id, parsedInput.newPassword);

  return { success: true };
});

export const updateProfileAction = actionClient.schema(updateProfileSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user) throw new Error('No autenticado');

  await updateSeller(user.id, parsedInput);

  try {
    const ownerId = typeof user.owner === 'number' ? user.owner : user.owner?.id;
    const channels = [`private-seller-${user.id}`];
    if (ownerId && ownerId !== user.id) {
      channels.push(`private-owner-${ownerId}`);
    }
    await pusherServer.trigger(channels, 'user_updated', { metadata: { userId: user.id } });
  } catch {}

  return { success: true };
});

export const updateBusinessDataAction = actionClient
  .schema(updateBusinessDataSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) throw new Error('No autenticado');

    if (user.role !== 'owner') throw new Error('Solo los dueños pueden actualizar los datos de empresa');

    await updateSeller(user.id, parsedInput);

    try {
      const sellers = await getSellers(user.id);
      const channels = [`private-owner-${user.id}`, ...sellers.map((s) => `private-seller-${s.id}`)];
      await pusherServer.trigger(channels, 'business_updated', { metadata: { userId: user.id } });
    } catch {}

    return { success: true };
  });

export const updateBusinessNameAction = actionClient
  .schema(updateBusinessNameSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) throw new Error('No autenticado');

    if (user.role !== 'owner') throw new Error('Solo los dueños pueden actualizar el nombre del negocio');

    await updateSeller(user.id, { businessName: parsedInput.businessName });

    try {
      const sellers = await getSellers(user.id);
      const channels = [`private-owner-${user.id}`, ...sellers.map((s) => `private-seller-${s.id}`)];
      await pusherServer.trigger(channels, 'business_updated', { metadata: { userId: user.id } });
    } catch {}

    return { success: true };
  });

export const getCurrentUserAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user) throw new Error('No autenticado');

  const businessName =
    user.role === 'owner'
      ? (user.businessName ?? null)
      : user.role === 'seller' && typeof user.owner === 'number'
        ? ((await getOwnerById(user.owner))?.businessName ?? null)
        : null;

  return {
    businessName,
    businessCuit: user.role === 'owner' ? (user.businessCuit ?? null) : null,
    businessPhone: user.role === 'owner' ? (user.businessPhone ?? null) : null,
    businessAddress: user.role === 'owner' ? (user.businessAddress ?? null) : null,
    ivaCondition: user.role === 'owner' ? (user.ivaCondition ?? null) : null,
    phone: user.phone ?? null,
    dni: user.dni ?? null,
    cuitCuil: user.cuitCuil ?? null,
    cbu: user.cbu ?? null,
  };
});
