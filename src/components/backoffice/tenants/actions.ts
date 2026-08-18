'use server';

import {
  getTenantDetail,
  getTenantProducts,
  getTenantSales,
  getTenantSellers,
  getTenantSnapshots,
  listTenants,
  type ListTenantsResult,
  type TenantDetailData,
} from '@/app/services/backoffice/tenants';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { actionClient } from '@/lib/safe-action';
import { tenantDetailSchema } from '@/schemas/backoffice/tenant-detail-schema';
import { tenantListSchema } from '@/schemas/backoffice/tenant-list-schema';

export const listTenantsAction = actionClient.schema(tenantListSchema).action(async ({ parsedInput }) => {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  const data: ListTenantsResult = await listTenants(parsedInput);

  return { success: true, data };
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
