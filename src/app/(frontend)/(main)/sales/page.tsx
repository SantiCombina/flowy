import { type Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { loadSales } from '@/app/loaders/sales';
import { PlanCapabilityDenied } from '@/components/entitlements/plan-capability-denied';
import { PageHeader } from '@/components/layout/page-header';
import { RealtimeRefresher } from '@/components/notifications/realtime-refresher';
import { SalesSection } from '@/components/sales/sales-section';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { hasModuleAccess, MODULE_ACCESS } from '@/lib/entitlements/module-access';
import type { GetSalesListValues } from '@/schemas/sales/sales-list-schema';

export const metadata: Metadata = {
  title: 'Ventas',
};

const moduleAccess = MODULE_ACCESS['/sales'];

const SORT_VALUES = new Set<string>([
  'date',
  'seller',
  'client',
  'items',
  'total',
  'paymentMethod',
  'paymentStatus',
  'deliveryStatus',
  'zone',
]);
const SORT_DIR_VALUES = new Set<string>(['asc', 'desc']);
const PAYMENT_STATUS_VALUES = new Set<string>(['pending', 'collected']);
const PAYMENT_METHOD_VALUES = new Set<string>(['cash', 'transfer', 'check', '__credit__']);
const DELIVERY_STATUS_VALUES = new Set<string>(['pending', 'delivered']);
const VALID_LIMITS = [25, 50, 100] as const;
function parsePage(value: string | null): number {
  const parsed = parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseLimit(value: string | null): 25 | 50 | 100 {
  const parsed = parseInt(value ?? '25', 10);
  return VALID_LIMITS.includes(parsed as 25 | 50 | 100) ? (parsed as 25 | 50 | 100) : 25;
}

function parseOptionalDate(value: string | null): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

function parseOptionalPositiveInt(value: string | null): number | undefined {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseEnum<T extends string>(value: string | null, valid: Set<string>): T | undefined {
  return value && valid.has(value) ? (value as T) : undefined;
}

function getFirstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function SalesDataFetcher({
  searchParams: paramsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  const isSeller = user.role === 'seller';
  const channel = isSeller ? `private-seller-${user.id}` : `private-owner-${user.id}`;

  const params = await paramsPromise;

  const paymentStatusFromLegacy = getFirstParam(params.status);
  const paymentStatus =
    parseEnum<NonNullable<GetSalesListValues['paymentStatus']>>(
      getFirstParam(params.paymentStatus),
      PAYMENT_STATUS_VALUES,
    ) || parseEnum<NonNullable<GetSalesListValues['paymentStatus']>>(paymentStatusFromLegacy, PAYMENT_STATUS_VALUES);

  const dateFrom = parseOptionalDate(getFirstParam(params.dateFrom));
  const dateTo = parseOptionalDate(getFirstParam(params.dateTo));

  const initialFilters: GetSalesListValues = {
    page: parsePage(getFirstParam(params.page)),
    limit: parseLimit(getFirstParam(params.limit)),
    sort: parseEnum<NonNullable<GetSalesListValues['sort']>>(getFirstParam(params.sort), SORT_VALUES) || 'date',
    sortDir:
      parseEnum<NonNullable<GetSalesListValues['sortDir']>>(getFirstParam(params.sortDir), SORT_DIR_VALUES) || 'desc',
    dateFrom: dateFrom ?? '',
    dateTo: dateTo ?? '',
    paymentStatus,
    zone: parseOptionalPositiveInt(getFirstParam(params.zone)),
    paymentMethod: parseEnum<NonNullable<GetSalesListValues['paymentMethod']>>(
      getFirstParam(params.paymentMethod),
      PAYMENT_METHOD_VALUES,
    ),
    deliveryStatus: parseEnum<NonNullable<GetSalesListValues['deliveryStatus']>>(
      getFirstParam(params.deliveryStatus),
      DELIVERY_STATUS_VALUES,
    ),
  };

  const { zones, result: initialResult } = await loadSales(
    {
      dateFrom: initialFilters.dateFrom,
      dateTo: initialFilters.dateTo,
      paymentStatus: initialFilters.paymentStatus,
      zone: initialFilters.zone,
      paymentMethod: initialFilters.paymentMethod,
      deliveryStatus: initialFilters.deliveryStatus,
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
      <RealtimeRefresher channel={channel} events={['sale_created', 'payment_registered']} />
      <SalesSection
        initialFilters={initialFilters}
        initialResult={initialResult}
        zones={zones}
        showSellerColumn={!isSeller}
        canCollect={guardedUser.capabilities.has('sale.collect')}
        canManage={guardedUser.capabilities.has('sale.create')}
        isSeller={isSeller}
        initialStatusFilter={paymentStatus}
      />
    </>
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const guardedUser = await loadActiveGuardedUser();

  if (guardedUser.user.role !== 'owner' && guardedUser.user.role !== 'seller') {
    redirect('/dashboard');
  }

  if (!hasModuleAccess(guardedUser.capabilities, moduleAccess)) {
    return <PlanCapabilityDenied access={moduleAccess} />;
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Registro y seguimiento de ventas"
        actions={<ColumnVisibilityDropdown tableName="sales" />}
      />
      <Suspense
        fallback={
          <main className="min-w-0 flex-1 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TableSkeleton columns={9} hasActions />
          </main>
        }
      >
        <SalesDataFetcher searchParams={searchParams} />
      </Suspense>
    </>
  );
}
