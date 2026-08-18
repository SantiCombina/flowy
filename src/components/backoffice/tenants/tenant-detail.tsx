'use client';

import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';

import type { TenantDetailData } from '@/app/services/backoffice/tenants';

import { getTenantDetailAction } from './actions';
import { TenantTabs } from './tabs';
import { TenantHeader } from './tenant-header';

interface TenantDetailProps {
  initialData: TenantDetailData;
}

export function TenantDetail({ initialData }: TenantDetailProps) {
  const { execute: refetch } = useAction(getTenantDetailAction, {
    onSuccess: () => {
      /* trigger keep-alive signal only — UI shows SSR data */
    },
  });

  useEffect(() => {
    refetch({ id: initialData.owner.id });
  }, [refetch, initialData.owner.id]);

  return (
    <div className="flex flex-1 flex-col">
      <TenantHeader data={initialData} />
      <TenantTabs data={initialData} />
    </div>
  );
}
