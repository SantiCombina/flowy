'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import {
  deactivateTenant,
  getManagedTenant,
  getTenantDetail,
  getTenantProducts,
  getTenantSales,
  getTenantSellers,
  getTenantSnapshots,
  reactivateTenant,
  type TenantDetailData,
  updateTenantControlDate,
} from '@/app/services/backoffice/tenants';
import { assignOrChangeTenantPlan } from '@/app/services/entitlements';
import { cacheTags } from '@/lib/cache-tags';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { tenantDetailSchema } from '@/schemas/backoffice/tenant-detail-schema';
import { changeTenantPlanSchema, reactivateTenantSchema, tenantControlDateSchema } from '@/schemas/backoffice/manage-tenant-schema';

async function requireManagedTenant(id: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin' || user.id === id) throw new Error('No autorizado');
  const owner = await getManagedTenant(id);
  if (!owner) throw new Error('Tenant no encontrado');
  return { user, owner };
}

function refreshTenant(id: number) {
  revalidatePath(`/backoffice/tenants/${id}`);
  revalidatePath('/backoffice/tenants');
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
  revalidateTag(cacheTags.adminBackofficeTenants());
  revalidateTag(cacheTags.adminBackofficeDashboard());
}

export const deactivateTenantAction = actionClient.schema(tenantDetailSchema).action(async ({ parsedInput }) => {
  await requireManagedTenant(parsedInput.id);
  await deactivateTenant(parsedInput.id);
  refreshTenant(parsedInput.id);
  return { success: true };
});

export const reactivateTenantAction = actionClient.schema(reactivateTenantSchema).action(async ({ parsedInput }) => {
  const { user } = await requireManagedTenant(parsedInput.id);
  const result = await reactivateTenant(parsedInput.id, parsedInput.recoveryConfirmed, user.id);
  if (result.requiresRecovery) return { success: false, ...result };
  refreshTenant(parsedInput.id);
  return { success: true, ...result };
});

export const changeTenantPlanAction = actionClient.schema(changeTenantPlanSchema).action(async ({ parsedInput }) => {
  const { user, owner } = await requireManagedTenant(parsedInput.id);
  if (owner.isActive === false || owner.entitlementState === 'blocked') {
    throw new Error('No se puede cambiar el plan de un tenant desactivado o bloqueado');
  }
  await assignOrChangeTenantPlan(parsedInput.id, parsedInput.planVersionId, user.id);
  refreshTenant(parsedInput.id);
  return { success: true };
});

export const updateTenantControlDateAction = actionClient.schema(tenantControlDateSchema).action(async ({ parsedInput }) => {
  await requireManagedTenant(parsedInput.id);
  await updateTenantControlDate(
    parsedInput.id,
    parsedInput.planControlDate ? `${parsedInput.planControlDate}T12:00:00.000Z` : null,
  );
  refreshTenant(parsedInput.id);
  return { success: true };
});

export const getTenantDetailAction = actionClient.schema(tenantDetailSchema).action(async ({ parsedInput }) => {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const detail = await getTenantDetail(parsedInput.id);
  if (!detail) {
    throw new Error('Tenant no encontrado');
  }

  const [sellers, products, sales, snapshots] = await Promise.all([
    getTenantSellers(parsedInput.id),
    getTenantProducts(parsedInput.id),
    getTenantSales(parsedInput.id),
    getTenantSnapshots(parsedInput.id),
  ]);

  const data: TenantDetailData = {
    ...detail,
    sellers,
    products,
    sales,
    snapshots,
  };

  return { success: true, data };
});
