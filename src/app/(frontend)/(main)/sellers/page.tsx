import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getSellersCommissionSummaries } from '@/app/services/commissions';
import { getVariantsWithProducts } from '@/app/services/products';
import { getSellers } from '@/app/services/users';
import { SellersSection } from '@/components/sellers/sellers-section';
import { getCurrentUser } from '@/lib/payload';

import SellersLoading from './loading';

export const metadata: Metadata = {
  title: 'Vendedores',
};

async function SellersData({ ownerId }: { ownerId: number }) {
  const [sellers, variantsResult, commissionSummaries] = await Promise.all([
    getSellers(ownerId),
    getVariantsWithProducts(ownerId, undefined, { limit: 1000 }),
    getSellersCommissionSummaries(ownerId),
  ]);

  return (
    <SellersSection
      sellers={sellers}
      variants={variantsResult.docs}
      ownerId={ownerId}
      commissionBalances={Object.fromEntries(commissionSummaries)}
    />
  );
}

export default async function SellersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Suspense fallback={<SellersLoading />}>
      <SellersData ownerId={user.id} />
    </Suspense>
  );
}
