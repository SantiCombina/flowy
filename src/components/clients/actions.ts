'use server';

import { createClient, deleteClient, getClientDebts, getClients, updateClient } from '@/app/services/clients';
import { getZoneById } from '@/app/services/zones';
import {
  assertAnyUserCapability,
  assertUserCapability,
  hasCapability,
  resolveUserEntitlementContext,
} from '@/lib/entitlements/guards';
import { assertClientMutationAllowed } from '@/lib/entitlements/scoped-operations';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { clientSchema, deleteClientSchema, updateClientSchema } from '@/schemas/clients/client-schema';

export const createClientAction = actionClient.schema(clientSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  await assertUserCapability(user, 'client.manage');

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

  const entitlementContext = await resolveUserEntitlementContext(user);
  const canUseContactFields = hasCapability(
    user,
    entitlementContext.dbSnapshot,
    'client.contact-fields',
    entitlementContext.entitlementState,
  );
  const canManageZones = hasCapability(
    user,
    entitlementContext.dbSnapshot,
    'zones.manage',
    entitlementContext.entitlementState,
  );

  assertClientMutationAllowed(
    parsedInput,
    new Set([...(canUseContactFields ? ['client.contact-fields'] : []), ...(canManageZones ? ['zones.manage'] : [])]),
  );

  const clientData = canUseContactFields ? parsedInput : { name: parsedInput.name };

  if (parsedInput.zone && canUseContactFields) {
    const zone = await getZoneById(parsedInput.zone, ownerId);
    if (!zone) {
      throw new Error('La zona seleccionada no existe o no pertenece a tu negocio');
    }
  }

  const client = await createClient(sellerId, ownerId, clientData);

  return { success: true, client };
});

export const updateClientAction = actionClient.schema(updateClientSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  await assertUserCapability(user, 'client.manage');

  const { id, ...data } = parsedInput;
  const entitlementContext = await resolveUserEntitlementContext(user);
  const canUseContactFields = hasCapability(
    user,
    entitlementContext.dbSnapshot,
    'client.contact-fields',
    entitlementContext.entitlementState,
  );
  const canManageZones = hasCapability(
    user,
    entitlementContext.dbSnapshot,
    'zones.manage',
    entitlementContext.entitlementState,
  );

  assertClientMutationAllowed(
    data,
    new Set([...(canUseContactFields ? ['client.contact-fields'] : []), ...(canManageZones ? ['zones.manage'] : [])]),
  );

  const clientData = canUseContactFields ? data : { name: data.name };

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0);

  if (clientData.zone && canUseContactFields) {
    const zone = await getZoneById(clientData.zone, ownerId);
    if (!zone) {
      throw new Error('La zona seleccionada no existe o no pertenece a tu negocio');
    }
  }

  const client = await updateClient(id, clientData, ownerId);

  return { success: true, client };
});

export const deleteClientAction = actionClient.schema(deleteClientSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  await assertUserCapability(user, 'client.delete');

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0);

  await deleteClient(parsedInput.id, ownerId);

  return { success: true };
});

export const getClientDebtsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  await assertAnyUserCapability(user, ['client.read', 'client.manage']);

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

  await assertAnyUserCapability(user, ['client.read', 'client.manage']);

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
