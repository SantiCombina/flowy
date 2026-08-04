'use server';

import { buildMediaDeleteWhere } from '@/lib/entitlements/media-boundary';
import { getPayloadClient } from '@/lib/payload';
import type { Media } from '@/payload-types';

export async function deleteMedia(id: number, tenantId: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({
    collection: 'media',
    where: buildMediaDeleteWhere(id, tenantId),
    overrideAccess: true,
  });
}

export async function getOrphanedMedia(): Promise<Media[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'media',
    where: {
      or: [{ tenant: { exists: false } }, { tenant: { equals: null } }],
    },
    overrideAccess: true,
  });

  return result.docs as Media[];
}
