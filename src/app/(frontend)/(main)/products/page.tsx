import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getBrands, getCategories, getPresentations, getQualities } from '@/app/services/entities';
import { getVariantsWithProducts } from '@/app/services/products';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ProductsSection } from '@/components/products/products-section';
import { getCurrentUser } from '@/lib/payload';
import type { Brand, Category, Presentation, Quality } from '@/payload-types';

import ProductsLoading from './loading';

export const metadata: Metadata = {
  title: 'Productos',
};

async function ProductsContent({ ownerId, canManageProducts }: { ownerId: number; canManageProducts: boolean }) {
  let brands: Brand[] = [];
  let categories: Category[] = [];
  let qualities: Quality[] = [];
  let presentations: Presentation[] = [];

  if (canManageProducts) {
    [brands, categories, qualities, presentations] = await Promise.all([
      getBrands(ownerId),
      getCategories(ownerId),
      getQualities(ownerId),
      getPresentations(ownerId),
    ]);
  }

  const initialVariants = await getVariantsWithProducts(ownerId, {}, { limit: 50, page: 1, sort: 'product' });

  return (
    <ProductsSection
      initialRefData={{ brands, categories, qualities, presentations }}
      initialVariants={initialVariants}
    />
  );
}

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const channel =
    user.role === 'owner' || user.role === 'admin' ? `private-owner-${user.id}` : `private-seller-${user.id}`;

  const canManageProducts = user.role === 'owner' || user.role === 'admin';
  const ownerId =
    user.role === 'seller' ? (typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0)) : user.id;

  return (
    <>
      <RealtimeRefresher channel={channel} events={['stock_adjusted', 'stock_low', 'sale_created']} />
      <Suspense fallback={<ProductsLoading />}>
        <ProductsContent ownerId={ownerId} canManageProducts={canManageProducts} />
      </Suspense>
    </>
  );
}
