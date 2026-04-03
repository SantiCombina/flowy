'use server';

import { changePassword, loginUser as loginUserService, updateSeller } from '@/app/services/users';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { changePasswordSchema } from '@/schemas/profile/change-password-schema';
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

  return { success: true };
});

export const updateBusinessNameAction = actionClient
  .schema(updateBusinessNameSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) throw new Error('No autenticado');

    if (user.role !== 'owner') throw new Error('Solo los dueños pueden actualizar el nombre del negocio');

    await updateSeller(user.id, { businessName: parsedInput.businessName });

    return { success: true };
  });
