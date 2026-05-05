'use server';

import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import type { Client } from '@/payload-types';
import type { ClientValues } from '@/schemas/clients/client-schema';

export async function getClients({ ownerId, sellerId }: { ownerId: number; sellerId?: number }): Promise<Client[]> {
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
      createdBy: sellerId,
      owner: ownerId,
    },
    overrideAccess: true,
  });

  return client as Client;
}

export async function updateClient(clientId: number, data: ClientValues): Promise<Client> {
  const payload = await getPayloadClient();

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
    },
    overrideAccess: true,
  });

  return client as Client;
}

export async function deleteClient(clientId: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({
    collection: 'clients',
    id: clientId,
    overrideAccess: true,
  });
}

export async function getClientDebts({
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
    if (sale.ownerPaymentStatus === 'collected') continue;

    const clientId = typeof sale.client === 'number' ? sale.client : sale.client.id;
    const remaining = sale.total - (sale.amountPaid ?? 0);

    if (remaining > 0) {
      debts[clientId] = (debts[clientId] ?? 0) + remaining;
    }
  }

  return debts;
}
