'use server';

import { revalidatePath } from 'next/cache';

import { deleteTenantPayment, saveTenantPayment } from '@/app/services/backoffice/tenant-payments';
import { getManagedTenant } from '@/app/services/backoffice/tenants';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { deleteTenantPaymentSchema, tenantPaymentSchema } from '@/schemas/backoffice/tenant-payment-schema';

async function requireAdminAndTenant(ownerId: number) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') throw new Error('No autorizado');
  if (!await getManagedTenant(ownerId)) throw new Error('Tenant no encontrado');
  return admin;
}

function refreshPayments(ownerId: number) {
  revalidatePath(`/backoffice/tenants/${ownerId}`);
  revalidatePath('/admin/collections/tenant-plan-payments');
}

export const saveTenantPaymentAction = actionClient.schema(tenantPaymentSchema).action(async ({ parsedInput }) => {
  const admin = await requireAdminAndTenant(parsedInput.ownerId);
  await saveTenantPayment(parsedInput.ownerId, parsedInput, admin);
  refreshPayments(parsedInput.ownerId);
  return { success: true };
});

export const deleteTenantPaymentAction = actionClient.schema(deleteTenantPaymentSchema).action(async ({ parsedInput }) => {
  const admin = await requireAdminAndTenant(parsedInput.ownerId);
  await deleteTenantPayment(parsedInput.ownerId, parsedInput.paymentId, admin);
  refreshPayments(parsedInput.ownerId);
  return { success: true };
});
