import { calculatePrice } from '@/lib/money';
import { resolveId } from '@/lib/payload-utils';

export interface PriceListRow {
  name: string;
  price: number;
}

export interface PriceListData {
  businessName: string;
  date: string;
  rows: PriceListRow[];
}

interface PriceListVariant {
  id: number;
  owner?: number | { id: number } | null;
  product: number | { name: string; owner?: number | { id: number } | null };
  presentation?: number | { label: string; owner?: number | { id: number } | null } | null;
  costPrice: number;
  profitMargin?: number | null;
}

export async function collectPriceListRows(
  ownerId: number,
  readPage: (ownerId: number, page: number) => Promise<{ docs: PriceListVariant[]; hasNextPage: boolean }>,
): Promise<PriceListRow[]> {
  const rows: PriceListRow[] = [];
  let page = 1;
  let hasNextPage: boolean;
  do {
    const result = await readPage(ownerId, page);
    for (const variant of result.docs) {
      const product = typeof variant.product === 'object' ? variant.product : null;
      if (resolveId(variant.owner) !== ownerId || !product || resolveId(product.owner) !== ownerId) continue;
      const presentation = typeof variant.presentation === 'object' ? variant.presentation : null;
      if (presentation && resolveId(presentation.owner) !== ownerId) continue;
      const price = calculatePrice(variant.costPrice, variant.profitMargin ?? 0);
      if (!Number.isFinite(price) || price < 0) throw new Error('Un producto tiene un precio inválido');
      rows.push({
        name: [product.name, presentation?.label].filter(Boolean).join(' - '),
        price,
      });
    }
    hasNextPage = result.hasNextPage;
    page += 1;
  } while (hasNextPage);
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'es-AR'));
}
