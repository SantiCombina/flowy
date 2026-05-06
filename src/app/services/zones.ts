'use server';

import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import type { Zone } from '@/payload-types';
import type { CreateZoneValues } from '@/schemas/zones/zone-schema';

export async function getZones(ownerId: number): Promise<Zone[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'zones',
    where: { owner: { equals: ownerId } },
    limit: 1000,
    overrideAccess: true,
    sort: 'name',
  });

  return result.docs as Zone[];
}

export async function createZone(ownerId: number, data: CreateZoneValues): Promise<Zone> {
  const payload = await getPayloadClient();

  const zone = await payload.create({
    collection: 'zones',
    data: {
      name: data.name,
      owner: ownerId,
    },
    overrideAccess: true,
  });

  return zone as Zone;
}

export async function updateZone(zoneId: number, name: string): Promise<Zone> {
  const payload = await getPayloadClient();

  const zone = await payload.update({
    collection: 'zones',
    id: zoneId,
    data: { name },
    overrideAccess: true,
  });

  return zone as Zone;
}

export async function getZoneById(zoneId: number, ownerId: number): Promise<Zone | null> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'zones',
    where: {
      id: { equals: zoneId },
      owner: { equals: ownerId },
    },
    limit: 1,
    overrideAccess: true,
  });

  return result.docs[0] as Zone | null;
}

export async function deleteZone(zoneId: number): Promise<void> {
  const payload = await getPayloadClient();

  const clientsWithZone = await payload.find({
    collection: 'clients',
    where: { zone: { equals: zoneId } },
    limit: 0,
    overrideAccess: true,
  });

  if (clientsWithZone.totalDocs > 0) {
    await payload.update({
      collection: 'clients',
      where: { zone: { equals: zoneId } },
      data: { zone: null },
      overrideAccess: true,
    });
  }

  await payload.delete({
    collection: 'zones',
    id: zoneId,
    overrideAccess: true,
  });
}
