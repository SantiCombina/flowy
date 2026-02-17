import { redirect } from 'next/navigation';

import { getSellers } from '@/app/services/users';
import { SellersSection } from '@/components/sellers/sellers-section';
import { getCurrentUser } from '@/lib/payload';

export default async function SellersPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    redirect('/login');
  }

  const ownerId = user.role === 'owner' ? user.id : user.id;
  const sellers = await getSellers(ownerId);

  return <SellersSection sellers={sellers} />;
}
