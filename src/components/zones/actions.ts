'use server';

import { createZone, deleteZone, getZones, updateZone } from '@/app/services/zones';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { createZoneSchema, deleteZoneSchema, updateZoneSchema } from '@/schemas/zones/zone-schema';

export const getZonesAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
    throw new Error('No autorizado');
  }

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('No se pudo determinar el owner');
  }

  const zones = await getZones(ownerId);

  return { success: true, zones };
});

export const createZoneAction = actionClient.schema(createZoneSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const zone = await createZone(user.id, parsedInput);

  return { success: true, zone };
});

export const updateZoneAction = actionClient.schema(updateZoneSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const zone = await updateZone(id, data.name);

  return { success: true, zone };
});

export const deleteZoneAction = actionClient.schema(deleteZoneSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await deleteZone(parsedInput.id);

  return { success: true };
});
