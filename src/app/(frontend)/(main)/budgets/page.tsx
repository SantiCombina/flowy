import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getPaginatedBudgets } from '@/app/services/budgets';
import { BudgetsSection } from '@/components/budgets/budgets-section';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { budgetsUrlConstants, parseEnum, parseLimit, parseOptionalDate, parsePage } from '@/lib/budgets-url-utils';
import { getCurrentUser } from '@/lib/payload';
import type { GetBudgetsListValues } from '@/schemas/budgets/budget-list-schema';

export const metadata: Metadata = {
  title: 'Presupuestos',
};

function getFirstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function BudgetsDataFetcher({
  searchParams: paramsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'seller' && user.role !== 'owner') redirect('/dashboard');

  const isSeller = user.role === 'seller';
  const ownerId = isSeller ? (typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0)) : user.id;
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const params = await paramsPromise;

  const dateFrom = parseOptionalDate(getFirstParam(params.dateFrom));
  const dateTo = parseOptionalDate(getFirstParam(params.dateTo));

  const initialFilters: GetBudgetsListValues = {
    page: parsePage(getFirstParam(params.page)),
    limit: parseLimit(getFirstParam(params.limit)),
    sort:
      parseEnum<NonNullable<GetBudgetsListValues['sort']>>(
        getFirstParam(params.sort),
        budgetsUrlConstants.SORT_VALUES,
      ) || 'date',
    sortDir:
      parseEnum<NonNullable<GetBudgetsListValues['sortDir']>>(
        getFirstParam(params.sortDir),
        budgetsUrlConstants.SORT_DIR_VALUES,
      ) || 'desc',
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    status: parseEnum<NonNullable<GetBudgetsListValues['status']>>(
      getFirstParam(params.status),
      budgetsUrlConstants.STATUS_VALUES,
    ),
  };

  const initialResult = await getPaginatedBudgets(
    ownerId,
    {
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
      status: initialFilters.status,
    },
    {
      page: initialFilters.page,
      limit: initialFilters.limit,
      sort: initialFilters.sort,
      sortDir: initialFilters.sortDir,
    },
  );

  return (
    <>
      <RealtimeRefresher channel={channel} events={['budget_created']} />
      <BudgetsSection
        initialFilters={initialFilters}
        initialResult={initialResult}
        showSellerColumn={!isSeller}
        isSeller={isSeller}
      />
    </>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Cotizaciones y presupuestos para clientes"
        actions={<ColumnVisibilityDropdown tableName="budgets" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={8} />
          </main>
        }
      >
        <BudgetsDataFetcher searchParams={searchParams} />
      </Suspense>
    </>
  );
}
