'use server';

import { getOwnerDashboardStats, getSellerDashboardStats } from '@/app/services/dashboard';
import type { Period } from '@/app/services/dashboard';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { z } from 'zod';

const periodSchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']),
});

export const getOwnerDashboardStatsAction = actionClient
  .schema(periodSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const stats = await getOwnerDashboardStats(user.id, parsedInput.period as Period);

    return { success: true, stats };
  });

export const getSellerDashboardStatsAction = actionClient
  .schema(z.object({ period: z.enum(['day', 'week', 'month', 'year']), ownerId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'seller') {
      throw new Error('No autorizado');
    }

    const stats = await getSellerDashboardStats(user.id, parsedInput.ownerId, parsedInput.period as Period);

    return { success: true, stats };
  });
