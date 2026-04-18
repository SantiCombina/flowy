import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getBrands, getCategories, getPresentations, getQualities } from '@/app/services/entities';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ProductsSection } from '@/components/products/products-section';
import { getCurrentUser } from '@/lib/payload';

import ProductsLoading from './loading';

export const metadata: Metadata = {
  title: 'Productos',
};

async function ProductsContent({ userId, canManageProducts }: { userId: number; canManageProducts: boolean }) {
  const [brands, categories, qualities, presentations] = canManageProducts
    ? await Promise.all([getBrands(userId), getCategories(userId), getQualities(userId), getPresentations(userId)])
    : [[], [], [], []];

  return <ProductsSection initialRefData={{ brands, categories, qualities, presentations }} />;
}

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const channel =
    user.role === 'owner' || user.role === 'admin' ? `private-owner-${user.id}` : `private-seller-${user.id}`;

  const canManageProducts = user.role === 'owner' || user.role === 'admin';

  return (
    <>
      <RealtimeRefresher channel={channel} events={['stock_adjusted', 'stock_low', 'sale_created']} />
      <Suspense fallback={<ProductsLoading />}>
        <ProductsContent userId={user.id} canManageProducts={canManageProducts} />
      </Suspense>
    </>
  );
}
