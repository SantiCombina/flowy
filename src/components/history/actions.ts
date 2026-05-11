'use server';

import { z } from 'zod';

import { getHistoryMovements, type MovementType } from '@/app/services/stock-movements';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';

const historyFiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  types: z.array(z.string()).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const getHistoryAction = actionClient.schema(historyFiltersSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autenticado');
  }

  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const result = await getHistoryMovements(user.id, {
    ...(parsedInput.from ? { from: new Date(parsedInput.from) } : {}),
    ...(parsedInput.to ? { to: new Date(parsedInput.to) } : {}),
    ...(parsedInput.types ? { types: parsedInput.types as MovementType[] } : {}),
    ...(parsedInput.page ? { page: parsedInput.page } : {}),
    ...(parsedInput.limit ? { limit: parsedInput.limit } : {}),
  });

  return {
    success: true,
    ...result,
  };
});
