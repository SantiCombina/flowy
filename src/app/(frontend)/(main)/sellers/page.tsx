import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getSellersCommissionSummaries } from '@/app/services/commissions';
import { getVariantsWithProducts } from '@/app/services/products';
import { getSellers } from '@/app/services/users';
import { PageHeader } from '@/components/layout/page-header';
import { SellersSection } from '@/components/sellers/sellers-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Vendedores',
};

async function SellersData() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [sellers, variantsResult, commissionSummaries] = await Promise.all([
    getSellers(user.id),
    getVariantsWithProducts(user.id, undefined, { limit: 1000 }),
    getSellersCommissionSummaries(user.id),
  ]);

  return (
    <SellersSection
      initialSellers={{ success: true, sellers }}
      variants={variantsResult.docs}
      commissionBalances={Object.fromEntries(commissionSummaries)}
    />
  );
}

export default async function SellersPage() {
  return (
    <>
      <PageHeader
        title="Vendedores"
        description="Gestión del equipo de ventas"
        actions={<ColumnVisibilityDropdown tableName="sellers" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={7} rows={6} hasActions firstColumnVariant="status-dot" />
          </main>
        }
      >
        <SellersData />
      </Suspense>
    </>
  );
}
