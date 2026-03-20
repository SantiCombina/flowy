import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getVariantsWithProducts } from '@/app/services/products';
import { getSellers } from '@/app/services/users';
import { SellersSection } from '@/components/sellers/sellers-section';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Vendedores',
};

export default async function SellersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const ownerId = user.id;
  const [sellers, variantsResult] = await Promise.all([
    getSellers(ownerId),
    getVariantsWithProducts(ownerId, undefined, { limit: 1000 }),
  ]);

  return <SellersSection sellers={sellers} variants={variantsResult.docs} ownerId={ownerId} />;
}
