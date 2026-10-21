import type { TenantPaymentHistory } from '@/app/services/backoffice/tenant-payments';
import type { TenantDetailData } from '@/app/services/backoffice/tenants';
import type { TenantPaymentListValues } from '@/schemas/backoffice/tenant-payment-schema';

import { TenantTabs } from './tabs';
import { TenantHeader } from './tenant-header';

interface TenantDetailProps {
  initialData: TenantDetailData;
  payments?: TenantPaymentHistory;
  paymentFilters?: TenantPaymentListValues;
}

export function TenantDetail({ initialData, payments, paymentFilters }: TenantDetailProps) {
  return (
    <div className="flex flex-1 flex-col">
      <TenantHeader data={initialData} />
      <TenantTabs data={initialData} payments={payments} paymentFilters={paymentFilters} />
    </div>
  );
}
