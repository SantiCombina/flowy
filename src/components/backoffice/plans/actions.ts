'use server';

import { publishPlanVersion as publishPlanVersionAction } from '@/app/services/backoffice/plans';
import { listPlanVersions } from '@/app/services/backoffice/plans';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { actionClient } from '@/lib/safe-action';
import { publishAdminPlanSchema } from '@/schemas/entitlements/admin-plan-schema';

export const listPlanVersionsAction = actionClient.action(async () => {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const data = await listPlanVersions();
  return { success: true, data };
});

export const publishPlanAction = actionClient.schema(publishAdminPlanSchema).action(async ({ parsedInput }) => {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  await publishPlanVersionAction({
    planCode: parsedInput.planCode,
    capabilities: parsedInput.capabilities.map((capability) => ({ capability })),
    quotas: parsedInput.quotas,
    createdBy: guardedUser.user.id,
  });

  return { success: true };
});
