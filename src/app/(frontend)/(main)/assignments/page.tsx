import { redirect } from 'next/navigation';

import { getAllSellersInventoryForOwner } from '@/app/services/mobile-seller';
import { AssignmentsSection } from '@/components/assignments/assignments-section';
import { getCurrentUser } from '@/lib/payload';

export default async function AssignmentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const sellers = await getAllSellersInventoryForOwner(user.id);

  return <AssignmentsSection sellers={sellers} />;
}
