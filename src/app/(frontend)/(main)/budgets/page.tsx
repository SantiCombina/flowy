import { endOfMonth, format, startOfMonth } from 'date-fns';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getPaginatedBudgets } from '@/app/services/budgets';
import { BudgetsSection } from '@/components/budgets/budgets-section';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import {
  budgetsUrlConstants,
  parseEnum,
  parseLimit,
  parseOptionalDate,
  parsePage,
} from '@/lib/budgets-url-utils';
import { getCurrentUser } from '@/lib/payload';
import type { GetBudgetsListValues } from '@/schemas/budgets/budget-list-schema';

export const metadata: Metadata = {
  title: 'Presupuestos',
};

function getFirstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  return {
    dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'seller' && user.role !== 'owner') redirect('/dashboard');

  const params = await searchParams;
  const isSeller = user.role === 'seller';
  const ownerId = isSeller ? (typeof user.owner === 'number' ? user.owner : (user.owner?.id ?? 0)) : user.id;
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const dateFrom = parseOptionalDate(getFirstParam(params.dateFrom));
  const dateTo = parseOptionalDate(getFirstParam(params.dateTo));
  const defaultRange = dateFrom === undefined && dateTo === undefined ? getDefaultDateRange() : null;

  const initialFilters: GetBudgetsListValues = {
    page: parsePage(getFirstParam(params.page)),
    limit: parseLimit(getFirstParam(params.limit)),
    sort:
      parseEnum<NonNullable<GetBudgetsListValues['sort']>>(getFirstParam(params.sort), budgetsUrlConstants.SORT_VALUES) ||
      'date',
    sortDir:
      parseEnum<NonNullable<GetBudgetsListValues['sortDir']>>(
        getFirstParam(params.sortDir),
        budgetsUrlConstants.SORT_DIR_VALUES,
      ) || 'desc',
    dateFrom: dateFrom ?? defaultRange?.dateFrom,
    dateTo: dateTo ?? defaultRange?.dateTo,
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
