import type { Metadata } from 'next';

import { ProductsSection } from '@/components/products/products-section';

export const metadata: Metadata = {
  title: 'Productos',
};

export default function ProductsPage() {
  return <ProductsSection />;
}
