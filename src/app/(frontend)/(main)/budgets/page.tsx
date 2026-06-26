import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getBudgets } from '@/app/services/budgets';
import { BudgetsSection } from '@/components/budgets/budgets-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { getCurrentUser } from '@/lib/payload';

import BudgetsLoading from './loading';

export const metadata: Metadata = {
  title: 'Presupuestos',
};

async function BudgetsData({ ownerId }: { ownerId: number }) {
  const budgets = await getBudgets(ownerId);

  return <BudgetsSection initialBudgets={{ success: true, budgets }} />;
}

export default async function BudgetsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'seller' && user.role !== 'owner') redirect('/dashboard');

  const isSeller = user.role === 'seller';
  const ownerId = isSeller ? (typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0)) : user.id;
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  return (
    <>
      <RealtimeRefresher channel={channel} events={['budget_created']} />
      <Suspense fallback={<BudgetsLoading />}>
        <BudgetsData ownerId={ownerId} />
      </Suspense>
    </>
  );
}
