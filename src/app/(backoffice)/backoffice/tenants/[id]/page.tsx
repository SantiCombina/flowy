import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { getTenantDetail } from '@/app/services/backoffice/tenants';
import { TenantDetail } from '@/components/backoffice/tenants/tenant-detail';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

function parseTenantId(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function generateMetadata({ params }: TenantDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const tenantId = parseTenantId(id);
  if (tenantId === null) {
    return { title: 'Tenant' };
  }
  const detail = await getTenantDetail(tenantId);
  const title = detail?.owner.businessName?.trim() || detail?.owner.name || 'Tenant';
  return { title };
}

export default async function BackofficeTenantDetailPage({ params }: TenantDetailPageProps) {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const tenantId = parseTenantId(id);
  if (tenantId === null) {
    notFound();
  }

  const detail = await getTenantDetail(tenantId);
  if (!detail) {
    notFound();
  }

  return <TenantDetail initialData={detail} />;
}
