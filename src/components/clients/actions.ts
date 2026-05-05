'use server';

import { createClient, deleteClient, getClientDebts, getClients, updateClient } from '@/app/services/clients';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { clientSchema, deleteClientSchema, updateClientSchema } from '@/schemas/clients/client-schema';

export const createClientAction = actionClient.schema(clientSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  let sellerId: number;
  let ownerId: number;

  if (user.role === 'seller') {
    sellerId = user.id;
    ownerId = typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0);
    if (!ownerId) throw new Error('El vendedor no tiene un dueño asignado');
  } else {
    sellerId = user.id;
    ownerId = user.id;
  }

  const client = await createClient(sellerId, ownerId, parsedInput);

  return { success: true, client };
});

export const updateClientAction = actionClient.schema(updateClientSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const client = await updateClient(id, data);

  return { success: true, client };
});

export const deleteClientAction = actionClient.schema(deleteClientSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  await deleteClient(parsedInput.id);

  return { success: true };
});

export const getClientDebtsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0);
  const sellerId = user.role === 'seller' ? user.id : undefined;

  const debts = await getClientDebts({ ownerId, sellerId });

  return { success: true, debts };
});

export const getClientsForSaleAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'seller') {
    throw new Error('No autorizado');
  }

  const ownerId = typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('El vendedor no tiene un dueño asignado');
  }

  const clients = await getClients({ ownerId, sellerId: user.id });

  return {
    success: true,
    clients: clients.map((c) => ({ id: c.id, name: c.name })),
  };
});
