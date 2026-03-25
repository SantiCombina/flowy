import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ProductsSection } from '@/components/products/products-section';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Productos',
};

export default async function ProductsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const channel =
    user.role === 'owner' || user.role === 'admin' ? `private-owner-${user.id}` : `private-seller-${user.id}`;

  return (
    <>
      <RealtimeRefresher channel={channel} events={['stock_adjusted', 'stock_low', 'sale_created']} />
      <ProductsSection />
    </>
  );
}
