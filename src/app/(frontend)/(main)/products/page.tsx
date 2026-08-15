import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { loadVariantsWithProducts } from '@/app/loaders/products';
import { getBrands, getCategories, getPresentations, getQualities } from '@/app/services/entities';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ProductsSection } from '@/components/products/products-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { hasModuleAccess, MODULE_ACCESS, resolveProductsTenantId } from '@/lib/entitlements/module-access';
import type { Brand, Category, Presentation, Quality } from '@/payload-types';

export const metadata: Metadata = {
  title: 'Productos',
};

const moduleAccess = MODULE_ACCESS['/products'];

async function ProductsContent({
  ownerId,
  canManageProducts,
  capabilities,
}: {
  ownerId: number;
  canManageProducts: boolean;
  capabilities: string[];
}) {
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

  const initialVariants = await loadVariantsWithProducts({}, { limit: 1000, page: 1, sort: 'product' });

  return (
    <ProductsSection
      initialRefData={{ brands, categories, qualities, presentations }}
      initialVariants={initialVariants}
      capabilities={capabilities}
    />
  );
}

async function ProductsPageInner() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  const channel =
    user.role === 'owner' || user.role === 'admin' ? `private-owner-${user.id}` : `private-seller-${user.id}`;

  const canManageProducts = user.role === 'admin' || guardedUser.capabilities.has('catalog.manage');
  const ownerId = resolveProductsTenantId(user);

  if (ownerId === null) {
    redirect('/dashboard');
  }

  return (
    <>
      <RealtimeRefresher channel={channel} events={['stock_adjusted', 'stock_low', 'sale_created']} />
      <ProductsContent
        ownerId={ownerId}
        canManageProducts={canManageProducts}
        capabilities={[...guardedUser.capabilities]}
      />
    </>
  );
}

export default async function ProductsPage() {
  const guardedUser = await loadActiveGuardedUser();

  if (guardedUser.user.role !== 'owner' && guardedUser.user.role !== 'admin') {
    redirect('/dashboard');
  }

  if (!hasModuleAccess(guardedUser.capabilities, moduleAccess)) {
    return <PlanCapabilityDenied access={moduleAccess} />;
  }

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
