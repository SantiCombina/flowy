import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getBrands, getCategories, getPresentations, getQualities } from '@/app/services/entities';
import { getVariantsWithProducts } from '@/app/services/products';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ProductsSection } from '@/components/products/products-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { getCurrentUser } from '@/lib/payload';
import type { Brand, Category, Presentation, Quality } from '@/payload-types';

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

async function ProductsPageInner() {
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
      <ProductsContent ownerId={ownerId} canManageProducts={canManageProducts} />
    </>
  );
}

export default async function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Productos"
        description="Gestión del catálogo de productos"
        actions={<ColumnVisibilityDropdown tableName="products" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={7} rows={8} hasActions actionCount={2} />
          </main>
        }
      >
        <ProductsPageInner />
      </Suspense>
    </>
  );
}
