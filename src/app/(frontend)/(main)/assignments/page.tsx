import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAllSellersInventoryForOwner } from '@/app/services/mobile-seller';
import { AssignmentsSection } from '@/components/assignments/assignments-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Asignaciones',
};

export default async function AssignmentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const sellers = await getAllSellersInventoryForOwner(user.id);

  return (
    <>
      <RealtimeRefresher channel={`private-owner-${user.id}`} events={['stock_dispatched', 'stock_returned']} />
      <AssignmentsSection sellers={sellers} />
    </>
  );
}
