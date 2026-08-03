'use server';

import { activateTenantEntitlements } from '@/app/services/entitlement-rollout';
import { assignPlanToTenant, upgradeTenantPlan } from '@/app/services/entitlements';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { activateTenantSchema } from '@/schemas/entitlements/activate-tenant-schema';
import { assignPlanSchema } from '@/schemas/entitlements/assign-plan-schema';
import { upgradePlanSchema } from '@/schemas/entitlements/upgrade-plan-schema';

export const assignPlanAction = actionClient.schema(assignPlanSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  await assignPlanToTenant(parsedInput.tenantId, parsedInput.planVersionId, user.id);

  return { success: true };
});

export const upgradePlanAction = actionClient.schema(upgradePlanSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  await upgradeTenantPlan(parsedInput.tenantId, parsedInput.planVersionId, user.id);

  return { success: true };
});

export const activateTenantAction = actionClient.schema(activateTenantSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const activation = await activateTenantEntitlements(parsedInput);

  return { success: true, activation };
});
