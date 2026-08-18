import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { listPlanVersions } from '@/app/services/backoffice/plans';
import { PlansList } from '@/components/backoffice/plans/plans-list';
import { PageHeader } from '@/components/layout/page-header';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

export const metadata: Metadata = { title: 'Planes' };

export default async function BackofficePlansPage() {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const initialData = await listPlanVersions();

  return (
    <>
      <PageHeader title="Planes" description="Versiones publicadas de los planes Basic, Medium y Professional" />
      <PlansList initialData={initialData} />
    </>
  );
}
