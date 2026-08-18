import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { listTenants } from '@/app/services/backoffice/tenants';
import { TenantsList } from '@/components/backoffice/tenants/tenants-list';
import { PageHeader } from '@/components/layout/page-header';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import type { TenantListValues } from '@/schemas/backoffice/tenant-list-schema';

export const metadata: Metadata = { title: 'Tenants' };

type TenantsSearchParams = Partial<{
  q: string;
  planCode: string;
  state: string;
  page: string;
  limit: string;
}>;

function parseListParams(searchParams: TenantsSearchParams): TenantListValues {
  const planValues = ['basic', 'medium', 'professional'] as const;
  const stateValues = ['provisioning', 'active', 'blocked'] as const;

  const planCode = planValues.find((entry) => entry === searchParams.planCode);
  const state = stateValues.find((entry) => entry === searchParams.state);
  const page = Number.parseInt(searchParams.page ?? '1', 10);
  const limit = Number.parseInt(searchParams.limit ?? '20', 10);

  return {
    search: searchParams.q?.trim() || undefined,
    planCode,
    state,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(100, limit) : 20,
  };
}

export default async function BackofficeTenantsPage({ searchParams }: { searchParams: Promise<TenantsSearchParams> }) {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') redirect('/dashboard');

  const params = await searchParams;
  const filters = parseListParams(params);
  const initialData = await listTenants(filters);

  return (
    <>
      <PageHeader title="Tenants" description="Listado de tenants de la plataforma" />
      <TenantsList initialData={initialData} />
    </>
  );
}
