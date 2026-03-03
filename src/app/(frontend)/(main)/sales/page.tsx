import { redirect } from 'next/navigation';

import { getSales } from '@/app/services/sales';
import { SalesSection } from '@/components/sales/sales-section';
import { getCurrentUser } from '@/lib/payload';

export default async function SalesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'seller') {
    const sales = await getSales({ sellerId: user.id });
    return <SalesSection sales={sales} showSellerColumn={false} />;
  }

  if (user.role === 'owner') {
    const sales = await getSales({ ownerId: user.id });
    return <SalesSection sales={sales} showSellerColumn={true} />;
  }

  redirect('/');
}
