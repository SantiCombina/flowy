import { subDays, startOfDay, endOfDay } from 'date-fns';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Historial',
};

import { getHistoryMovements } from '@/app/services/stock-movements';
import { HistorySection } from '@/components/history/history-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

export default async function HistoryPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'owner' && user.role !== 'admin') redirect('/dashboard');

  const now = new Date();
  const initialDateRange = { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };

  const initialData = await getHistoryMovements(user.id, {
    from: initialDateRange.from,
    to: initialDateRange.to,
    page: 1,
    limit: 25,
  });

  return (
    <>
      <RealtimeRefresher
        channel={`private-owner-${user.id}`}
        events={['stock_adjusted', 'stock_dispatched', 'stock_returned', 'sale_created']}
      />
      <HistorySection initialData={{ success: true, ...initialData }} initialDateRange={initialDateRange} />
    </>
  );
}
