'use server';

import { getBackofficeDashboardStats, type BackofficeDashboardStats } from '@/app/services/backoffice/dashboard';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { actionClient } from '@/lib/safe-action';

export const getBackofficeDashboardStatsAction = actionClient.action(async () => {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const data: BackofficeDashboardStats = await getBackofficeDashboardStats();

  return { success: true, data };
});
