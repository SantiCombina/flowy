import { redirect } from 'next/navigation';

import { getMobileSellerInventory } from '@/app/services/mobile-seller';
import { MobileInventorySection } from '@/components/mobile-inventory/mobile-inventory-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

export default async function MobileInventoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'seller') {
    redirect('/');
  }

  const inventory = await getMobileSellerInventory(user.id);

  return (
    <>
      <RealtimeRefresher channel={`private-seller-${user.id}`} events={['stock_dispatched']} />
      <MobileInventorySection inventory={inventory} />
    </>
  );
}
