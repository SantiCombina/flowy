interface StockMovementTitleVariant {
  product: {
    name: string;
  };
  presentation: {
    label: string;
  } | null;
}

export function formatStockMovementVariantTitle(variant: StockMovementTitleVariant): string {
  return `${variant.product.name} - ${variant.presentation?.label ?? '-'}`;
}
