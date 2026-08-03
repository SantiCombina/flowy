import type { Where } from 'payload';

interface LegacyProductOwnership {
  mediaId: number;
  ownerId: number;
}

export function buildMediaDeleteWhere(mediaId: number, tenantId: number): Where {
  return {
    and: [{ id: { equals: mediaId } }, { tenant: { equals: tenantId } }],
  };
}

export function deriveLegacyMediaTenant(mediaId: number, products: readonly LegacyProductOwnership[]): number {
  const ownerIds = new Set(products.filter((product) => product.mediaId === mediaId).map((product) => product.ownerId));

  if (ownerIds.size === 0) {
    throw new Error('Missing legacy media owner');
  }
  if (ownerIds.size > 1) {
    throw new Error('Conflicting legacy media owners');
  }

  const ownerId = ownerIds.values().next().value;
  if (ownerId === undefined) {
    throw new Error('Missing legacy media owner');
  }
  return ownerId;
}
