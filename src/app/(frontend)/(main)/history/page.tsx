import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Historial',
};

import { getHistoryMovements } from '@/app/services/stock-movements';
import { HistorySection } from '@/components/history/history-section';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { getCurrentUser } from '@/lib/payload';

async function HistoryDataFetcher() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== 'owner' && user.role !== 'admin') redirect('/dashboard');

  const initialData = await getHistoryMovements(user.id, {
    page: 1,
    limit: 25,
  });

  return (
    <>
      <RealtimeRefresher
        channel={`private-owner-${user.id}`}
        events={['stock_adjusted', 'stock_dispatched', 'stock_returned', 'sale_created']}
      />
      <HistorySection initialData={{ success: true, ...initialData }} />
    </>
  );
}

export default async function HistoryPage() {
  return (
    <>
      <PageHeader
        title="Historial"
        description="Registro de movimientos de inventario"
        actions={<ColumnVisibilityDropdown tableName="history" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={7} />
          </main>
        }
      >
        <HistoryDataFetcher />
      </Suspense>
    </>
  );
}
