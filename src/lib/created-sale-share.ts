import type { Sale } from '@/payload-types';
import type { SaleValues } from '@/schemas/sales/sale-schema';

export interface CreatedSaleShare {
  date: string;
  notes?: string | null;
  total: number;
  items: Array<{
    variantId: number;
    variantName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CreatedSaleRecord {
  sale: Sale;
  variantDisplayNames: Record<number, string>;
}

export function toCreatedSaleShare(sale: Sale, variantDisplayNames: Record<number, string> = {}): CreatedSaleShare {
  return {
    date: sale.date,
    notes: sale.notes,
    total: sale.total,
    items: sale.items.map((item) => {
      const variantId = typeof item.variant === 'number' ? item.variant : item.variant.id;

      return {
        variantId,
        variantName: variantDisplayNames[variantId] ?? 'Producto desconocido',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    }),
  };
}

type CreateSale = (sellerId: number, ownerId: number, values: SaleValues) => Promise<CreatedSaleRecord>;

export async function createSaleAndMap(
  create: CreateSale,
  sellerId: number,
  ownerId: number,
  values: SaleValues,
): Promise<CreatedSaleShare> {
  const created = await create(sellerId, ownerId, values);
  return toCreatedSaleShare(created.sale, created.variantDisplayNames);
}
