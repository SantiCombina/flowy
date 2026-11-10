import type { SaleVariantOption } from '@/app/services/sales';
import type { SaleValues } from '@/schemas/sales/sale-schema';

export function planSaleStockRefresh(
  previousVariants: SaleVariantOption[],
  freshVariants: SaleVariantOption[],
  items: SaleValues['items'],
) {
  const freshById = new Map(freshVariants.map((variant) => [variant.variantId, variant]));
  const previousIds = new Set(previousVariants.map((variant) => variant.variantId));
  const variants = previousVariants.map((variant) => {
    const fresh = freshById.get(variant.variantId);
    return fresh
      ? {
          ...variant,
          warehouseStock: fresh.warehouseStock,
          personalStock: fresh.personalStock,
        }
      : variant;
  });
  variants.push(...freshVariants.filter((variant) => !previousIds.has(variant.variantId)));

  const adjustments: { index: number; quantity: number }[] = [];
  const missingVariantIds = new Set<number>();
  items.forEach((item, index) => {
    const fresh = freshById.get(item.variantId);
    if (!fresh) {
      missingVariantIds.add(item.variantId);
      return;
    }
    const available = Math.max(0, item.stockSource === 'personal' ? fresh.personalStock : fresh.warehouseStock);
    if (item.quantity > available) {
      adjustments.push({ index, quantity: available });
    }
  });

  return { variants, adjustments, missingVariantIds: [...missingVariantIds] };
}
