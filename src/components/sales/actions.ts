'use server';

import { z } from 'zod';

import { getClients } from '@/app/services/clients';
import {
  createSale,
  deleteSale,
  editSaleFull,
  getSaleOptions,
  getSaleOptionsForOwner,
  getSales,
  markAsDelivered,
  registerPayment,
} from '@/app/services/sales';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { collectSaleBySellerSchema, collectSaleSchema } from '@/schemas/sales/collect-sale-schema';
import { deleteSaleSchema } from '@/schemas/sales/delete-sale-schema';
import { editSaleFullSchema } from '@/schemas/sales/edit-sale-full-schema';
import { markAsDeliveredSchema } from '@/schemas/sales/mark-as-delivered-schema';
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

export const getSaleOptionsForOwnerAction = actionClient
  .schema(z.object({ sellerId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const options = await getSaleOptionsForOwner(parsedInput.sellerId, user.id);

    return { success: true, ...options };
  });

export const getSaleOptionsAsOwnerAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const options = await getSaleOptions(user.id, user.id);

  return { success: true, ...options };
});

export const createSaleAction = actionClient.schema(saleSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
    throw new Error('No autorizado');
  }

  if (user.role === 'owner') {
    await createSale(user.id, user.id, parsedInput);
  } else {
    const ownerId = typeof user.owner === 'number' ? user.owner : user.owner?.id;

    if (!ownerId) {
      throw new Error('El vendedor no tiene un dueño asignado');
    }

    await createSale(user.id, ownerId, parsedInput);
  }

  return { success: true };
});

export const markSaleAsCollectedAction = actionClient.schema(collectSaleSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await registerPayment(parsedInput.saleId, parsedInput.amount, { ownerId: user.id });

  return { success: true };
});

export const markSaleAsCollectedBySellerAction = actionClient
  .schema(collectSaleBySellerSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'seller') {
      throw new Error('No autorizado');
    }

    await registerPayment(parsedInput.saleId, parsedInput.amount, {
      sellerId: user.id,
      paymentMethod: parsedInput.paymentMethod,
      checkDueDate: parsedInput.checkDueDate ?? null,
    });

    return { success: true };
  });

export const deleteSaleAction = actionClient.schema(deleteSaleSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  const callerRole = user.role as 'owner' | 'seller';
  await deleteSale(parsedInput.saleId, user.id, callerRole);

  return { success: true };
});

export const editSaleFullAction = actionClient.schema(editSaleFullSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  const { saleId, ...saleData } = parsedInput;
  const callerRole = user.role as 'owner' | 'seller';
  await editSaleFull(saleId, user.id, callerRole, saleData);

  return { success: true };
});

export const getClientsForOwnerAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const clients = await getClients({ ownerId: user.id });

  return {
    success: true,
    clients: clients.map((c) => ({ id: c.id, name: c.name })),
  };
});

export const markAsDeliveredAction = actionClient.schema(markAsDeliveredSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  const callerRole = user.role as 'owner' | 'seller';
  await markAsDelivered(parsedInput.saleId, user.id, callerRole);

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
