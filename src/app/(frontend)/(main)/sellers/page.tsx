import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import type { CommissionPaymentRow, CommissionSummary } from '@/app/services/commissions';
import { getCommissionPayments, getCommissionSummary, getSellersCommissionSummaries } from '@/app/services/commissions';
import type { MobileInventoryItem } from '@/app/services/mobile-seller';
import { getMobileSellerInventoryForOwner } from '@/app/services/mobile-seller';
import { getVariantsWithProducts } from '@/app/services/products';
import { getSellers } from '@/app/services/users';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { SellersSection } from '@/components/sellers/sellers-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Vendedores',
};

interface CommissionDetail {
  summary: CommissionSummary;
  payments: CommissionPaymentRow[];
}

async function SellersData() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [sellers, variantsResult, commissionSummaries] = await Promise.all([
    getSellers(user.id),
    getVariantsWithProducts(user.id, undefined, { limit: 1000 }),
    getSellersCommissionSummaries(user.id),
  ]);

  const mobileInventory: Record<number, MobileInventoryItem[]> = {};
  await Promise.allSettled(
    sellers.map(async (s) => {
      const items = await getMobileSellerInventoryForOwner(s.id, user.id);
      mobileInventory[s.id] = items;
    }),
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const initialCommissionDetails: Record<string, CommissionDetail> = {};
  await Promise.allSettled(
    sellers.map(async (s) => {
      const period = { year: currentYear, month: currentMonth };
      const [summary, payments] = await Promise.all([
        getCommissionSummary(s.id, user.id, period),
        getCommissionPayments(s.id, user.id, period),
      ]);
      initialCommissionDetails[`${s.id}-${currentYear}-${currentMonth}`] = { summary, payments };
    }),
  );

  const channel = user.role === 'admin' ? `private-owner-${user.id}` : `private-owner-${user.id}`;

  return (
    <>
      <RealtimeRefresher
        channel={channel}
        events={['seller_invited', 'seller_updated', 'seller_deleted', 'stock_dispatched', 'stock_returned']}
        userId={user.id}
      />
      <SellersSection
        initialSellers={{ success: true, sellers }}
        variants={variantsResult.docs}
        commissionBalances={Object.fromEntries(commissionSummaries)}
        initialMobileInventory={mobileInventory}
        initialCommissionDetails={initialCommissionDetails}
      />
    </>
  );
}

export default async function SellersPage() {
  return (
    <>
      <PageHeader
        title="Vendedores"
        description="Gestión del equipo de ventas"
        actions={<ColumnVisibilityDropdown tableName="sellers" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={7} rows={6} hasActions firstColumnVariant="status-dot" />
          </main>
        }
      >
        <SellersData />
      </Suspense>
    </>
  );
}
