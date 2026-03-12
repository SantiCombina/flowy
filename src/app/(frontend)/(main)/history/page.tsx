import { subDays } from 'date-fns';
import { redirect } from 'next/navigation';

import { getHistoryMovements } from '@/app/services/stock-movements';
import { HistorySection } from '@/components/history/history-section';
import { getCurrentUser } from '@/lib/payload';

export default async function HistoryPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'owner' && user.role !== 'admin') redirect('/');

  const initialData = await getHistoryMovements(user.id, {
    from: subDays(new Date(), 29),
    to: new Date(),
    page: 1,
    limit: 25,
  });

  return <HistorySection initialData={initialData} ownerId={user.id} />;
}
