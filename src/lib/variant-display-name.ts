interface SaleVariantDisplayNameParts {
  brandName?: string;
  productName: string;
  presentationLabel?: string;
}

export function formatSaleVariantDisplayName(variant: SaleVariantDisplayNameParts | undefined): string {
  if (!variant) return 'Producto desconocido';

  return [variant.brandName, variant.productName, variant.presentationLabel].filter(Boolean).join(' · ');
}
