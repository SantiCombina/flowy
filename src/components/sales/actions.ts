'use server';

import { createSale, getSaleOptions, getSales, registerPayment } from '@/app/services/sales';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { collectSaleSchema } from '@/schemas/sales/collect-sale-schema';
import { saleSchema } from '@/schemas/sales/sale-schema';

export const getSaleOptionsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'seller') {
    throw new Error('No autorizado');
  }

  const ownerId = typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('El vendedor no tiene un dueño asignado');
  }

  const options = await getSaleOptions(user.id, ownerId);

  return { success: true, ...options };
});

export const createSaleAction = actionClient.schema(saleSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'seller') {
    throw new Error('No autorizado');
  }

  const ownerId = typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('El vendedor no tiene un dueño asignado');
  }

  await createSale(user.id, ownerId, parsedInput);

  return { success: true };
});

export const markSaleAsCollectedAction = actionClient.schema(collectSaleSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await registerPayment(parsedInput.saleId, user.id, parsedInput.amount);

  return { success: true };
});

export const getSalesAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autorizado');
  }

  if (user.role === 'seller') {
    const sales = await getSales({ sellerId: user.id });
    return { success: true, sales };
  }

  if (user.role === 'owner') {
    const sales = await getSales({ ownerId: user.id });
    return { success: true, sales };
  }

  throw new Error('No autorizado');
});
