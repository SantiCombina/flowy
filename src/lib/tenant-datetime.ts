import { getOwnerById } from '@/app/services/users';
import { DEFAULT_TENANT_TZ, formatDate, formatDateParts, formatShortDate } from '@/lib/datetime';
import { getCurrentUser } from '@/lib/payload';

export async function getTenantFormatters() {
  const user = await getCurrentUser();

  let tz: string = DEFAULT_TENANT_TZ;

  if (user?.timezone) {
    tz = user.timezone;
  } else if (user?.role === 'seller' && typeof user.owner === 'number') {
    const owner = await getOwnerById(user.owner);
    if (owner?.timezone) {
      tz = owner.timezone;
    }
  }

  return {
    tz,
    formatDate: (iso: string) => formatDate(iso, tz),
    formatDateParts: (iso: string) => formatDateParts(iso, tz),
    formatShortDate: (iso: string) => formatShortDate(iso, tz),
  };
}
