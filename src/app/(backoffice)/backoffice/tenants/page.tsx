import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { listTenants } from '@/app/services/backoffice/tenants';
import { TenantsList } from '@/components/backoffice/tenants/tenants-list';
import { PageHeader } from '@/components/layout/page-header';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

export const metadata: Metadata = { title: 'Tenants' };

export default async function BackofficeTenantsPage() {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') redirect('/dashboard');

  const initialData = await listTenants({ limit: 1000 });

  return (
    <>
      <PageHeader title="Tenants" description="Listado de tenants de la plataforma" />
      <TenantsList initialData={initialData} />
    </>
  );
}
