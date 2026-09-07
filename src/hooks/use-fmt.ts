'use client';

import { useUser } from '@/components/providers/user-provider';
import { DEFAULT_TENANT_TZ, formatDate, formatDateParts, formatShortDate } from '@/lib/datetime';

export function useFmt() {
  const user = useUser();
  const tz = user.timezone ?? DEFAULT_TENANT_TZ;

  return {
    tz,
    formatDate: (iso: string) => formatDate(iso, tz),
    formatDateParts: (iso: string) => formatDateParts(iso, tz),
    formatShortDate: (iso: string) => formatShortDate(iso, tz),
  };
}
