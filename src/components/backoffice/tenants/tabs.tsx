'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import type { TenantDetailData } from '@/app/services/backoffice/tenants';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TabProducts } from './tab-products';
import { TabSales } from './tab-sales';
import { TabSellers } from './tab-sellers';
import { TabSnapshots } from './tab-snapshots';

export const TENANT_TAB_KEYS = ['sellers', 'productos', 'ventas', 'snapshots'] as const;
export type TenantTabKey = (typeof TENANT_TAB_KEYS)[number];

const TAB_LABELS: Record<TenantTabKey, string> = {
  sellers: 'Vendedores',
  productos: 'Productos',
  ventas: 'Ventas',
  snapshots: 'Snapshots',
};

function isTabKey(value: string | null): value is TenantTabKey {
  return value !== null && (TENANT_TAB_KEYS as readonly string[]).includes(value);
}

interface TenantTabsProps {
  data: TenantDetailData;
}

export function TenantTabs({ data }: TenantTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab: TenantTabKey = isTabKey(rawTab) ? rawTab : 'sellers';

  function handleTabChange(next: string) {
    if (!isTabKey(next)) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'sellers') {
      params.delete('tab');
    } else {
      params.set('tab', next);
    }
    const query = params.toString();
    router.replace(`/backoffice/tenants/${data.owner.id}${query ? `?${query}` : ''}`, { scroll: false });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="px-4 pb-6 sm:px-6">
      <TabsList variant="line" className="w-full sm:w-fit">
        {TENANT_TAB_KEYS.map((key) => (
          <TabsTrigger key={key} value={key} className="gap-1.5">
            {TAB_LABELS[key]}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="sellers" className="mt-4">
        <TabSellers sellers={data.sellers} />
      </TabsContent>
      <TabsContent value="productos" className="mt-4">
        <TabProducts products={data.products} />
      </TabsContent>
      <TabsContent value="ventas" className="mt-4">
        <TabSales sales={data.sales} />
      </TabsContent>
      <TabsContent value="snapshots" className="mt-4">
        <TabSnapshots snapshots={data.snapshots} />
      </TabsContent>
    </Tabs>
  );
}
