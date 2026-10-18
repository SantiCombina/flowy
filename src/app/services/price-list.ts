'use server';

import { formatShortDate } from '@/lib/datetime';
import { getPayloadClient } from '@/lib/payload';
import { collectPriceListRows, type PriceListData } from '@/lib/price-list-data';

export async function getPriceList(ownerId: number): Promise<PriceListData> {
  const payload = await getPayloadClient();
  const owner = await payload.findByID({
    collection: 'users',
    id: ownerId,
    depth: 0,
    overrideAccess: true,
  });
  const rows = await collectPriceListRows(ownerId, async (tenantId, page) => {
    const result = await payload.find({
      collection: 'product-variants',
      where: { owner: { equals: tenantId } },
      depth: 1,
      limit: 500,
      page,
      sort: 'id',
      overrideAccess: true,
    });
    return { docs: result.docs, hasNextPage: result.hasNextPage };
  });
  return {
    businessName: owner.businessName?.trim() || owner.name,
    date: formatShortDate(new Date().toISOString(), owner.timezone ?? undefined),
    rows,
  };
}
