'use server';

import { z } from 'zod';

import { deleteMedia } from '@/app/services/media';
import { assertUserCapability } from '@/lib/entitlements/guards';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';

export const deleteMediaAction = actionClient
  .schema(
    z.object({
      id: z.number({
        required_error: 'El ID es requerido.',
        invalid_type_error: 'El ID debe ser un número.',
      }),
    }),
  )
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'catalog.manage');

    await deleteMedia(parsedInput.id, user.id);

    return { success: true };
  });
