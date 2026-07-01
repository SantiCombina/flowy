import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getAllSellersInventoryForOwner } from '@/app/services/mobile-seller';
import { AssignmentsSection } from '@/components/assignments/assignments-section';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Asignaciones',
};

async function AssignmentsData() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sellers = await getAllSellersInventoryForOwner(user.id);

  return (
    <>
      <RealtimeRefresher channel={`private-owner-${user.id}`} events={['stock_dispatched', 'stock_returned']} />
      <AssignmentsSection sellers={sellers} />
    </>
  );
}

export default async function AssignmentsPage() {
  return (
    <>
      <PageHeader title="Asignaciones" description="Stock en poder de tus vendedores" />
      <Suspense
        fallback={
          <div className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-6 w-44 animate-pulse rounded-full bg-muted" />
              <div className="h-6 w-48 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="h-9 w-full max-w-sm animate-pulse rounded-md bg-muted" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          </div>
        }
      >
        <AssignmentsData />
      </Suspense>
    </>
  );
}
