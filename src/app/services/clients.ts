'use server';

import { revalidateTag, unstable_cache } from 'next/cache';
import type { Where } from 'payload';

import { cacheTags } from '@/lib/cache-tags';
import { subtractMoney } from '@/lib/money';
import { getPayloadClient } from '@/lib/payload';
import { resolveId } from '@/lib/payload-utils';
import type { Client } from '@/payload-types';
import type { ClientValues } from '@/schemas/clients/client-schema';

async function _getClients({ ownerId, sellerId }: { ownerId: number; sellerId?: number }): Promise<Client[]> {
  const payload = await getPayloadClient();

  const where: Where = sellerId
    ? { and: [{ owner: { equals: ownerId } }, { createdBy: { equals: sellerId } }] }
    : { owner: { equals: ownerId } };

  const result = await payload.find({
    collection: 'clients',
    where,
    limit: 1000,
    overrideAccess: true,
    depth: 1,
  });

  return result.docs as Client[];
}

export async function getClients({ ownerId, sellerId }: { ownerId: number; sellerId?: number }): Promise<Client[]> {
  const tagId = sellerId ?? ownerId;

  return unstable_cache(async () => _getClients({ ownerId, sellerId }), ['clients', String(tagId)], {
    revalidate: 60 * 2,
    tags: [cacheTags.clients(tagId)],
  })();
}

export async function createClient(sellerId: number, ownerId: number, data: ClientValues): Promise<Client> {
  const payload = await getPayloadClient();

  const client = await payload.create({
    collection: 'clients',
    data: {
      name: data.name,
      cuit: data.cuit || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      provincia: data.provincia || null,
      localidad: data.localidad || null,
      zone: data.zone || null,
      createdBy: sellerId,
      owner: ownerId,
    },
    overrideAccess: true,
  });

  try {
    revalidateTag(cacheTags.clients(ownerId));
    revalidateTag(cacheTags.clientsDebts(ownerId));
    revalidateTag(cacheTags.saleOptions(ownerId));
  } catch {}

  return client as Client;
}

export async function updateClient(clientId: number, data: ClientValues, ownerId: number): Promise<Client> {
  const payload = await getPayloadClient();

  const existing = await payload.findByID({
    collection: 'clients',
    id: clientId,
    depth: 0,
    overrideAccess: true,
  });
  if (!existing || resolveId(existing.owner) !== ownerId) {
    throw new Error('Cliente no encontrado');
  }

  const client = await payload.update({
    collection: 'clients',
    id: clientId,
    data: {
      name: data.name,
      cuit: data.cuit || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      provincia: data.provincia || null,
      localidad: data.localidad || null,
      zone: data.zone || null,
    },
    overrideAccess: true,
  });

  try {
    const ownerId = resolveId(client.owner) ?? 0;
    revalidateTag(cacheTags.clients(ownerId));
    revalidateTag(cacheTags.clientsDebts(ownerId));
    revalidateTag(cacheTags.saleOptions(ownerId));
  } catch {}

  return client as Client;
}

export async function deleteClient(clientId: number, ownerId: number): Promise<void> {
  const payload = await getPayloadClient();

  const client = await payload.findByID({
    collection: 'clients',
    id: clientId,
    depth: 0,
    overrideAccess: true,
  });

  if (resolveId(client.owner) !== ownerId) {
    throw new Error('Cliente no encontrado');
  }

  await payload.delete({
    collection: 'clients',
    id: clientId,
    overrideAccess: true,
  });

  try {
    const ownerId = resolveId(client.owner) ?? 0;
    revalidateTag(cacheTags.clients(ownerId));
    revalidateTag(cacheTags.clientsDebts(ownerId));
    revalidateTag(cacheTags.saleOptions(ownerId));
  } catch {}
}

async function _getClientDebts({
  ownerId,
  sellerId,
}: {
  ownerId: number;
  sellerId?: number;
}): Promise<Record<number, number>> {
  const payload = await getPayloadClient();

  const conditions: Where[] = [{ owner: { equals: ownerId } }, { paymentStatus: { not_equals: 'collected' } }];

  if (sellerId) {
    conditions.push({ seller: { equals: sellerId } });
  }

  const result = await payload.find({
    collection: 'sales',
    where: { and: conditions },
    depth: 0,
    limit: 0,
    overrideAccess: true,
  });

  const debts: Record<number, number> = {};

  for (const sale of result.docs) {
    if (!sale.client) continue;

    const clientId = typeof sale.client === 'number' ? sale.client : sale.client.id;
    const paid = sale.amountPaid ?? 0;
    const remaining = subtractMoney(sale.total, paid);

    if (remaining > 0) {
      debts[clientId] = (debts[clientId] ?? 0) + remaining;
    }
  }

  return debts;
}

export async function getClientDebts({
  ownerId,
  sellerId,
}: {
  ownerId: number;
  sellerId?: number;
}): Promise<Record<number, number>> {
  const tagId = sellerId ?? ownerId;

  return unstable_cache(async () => _getClientDebts({ ownerId, sellerId }), ['clients-debts', String(tagId)], {
    revalidate: 30,
    tags: [cacheTags.clientsDebts(tagId)],
  })();
}
