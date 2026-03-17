import { redirect } from 'next/navigation';

import { getSales } from '@/app/services/sales';
import { SalesSection } from '@/components/sales/sales-section';
import { getCurrentUser } from '@/lib/payload';

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const initialStatusFilter =
    params.status === 'pending' ? 'pending' : params.status === 'collected' ? 'collected' : undefined;

  if (user.role === 'seller') {
    const sales = await getSales({ sellerId: user.id });
    return <SalesSection key="seller" sales={sales} showSellerColumn={false} isOwner={false} />;
  }

  if (user.role === 'owner') {
    const sales = await getSales({ ownerId: user.id });
    return (
      <SalesSection
        key={initialStatusFilter ?? 'all'}
        sales={sales}
        showSellerColumn={true}
        isOwner={true}
        initialStatusFilter={initialStatusFilter}
      />
    );
  }

  redirect('/');
}
