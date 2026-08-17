import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Metadata } from 'next';

import { AdminDashboard } from '@/components/backoffice/admin-dashboard';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    return null;
  }

  const monthLabel = format(new Date(), 'LLLL', { locale: es });

  return <AdminDashboard userName={guardedUser.user.name} monthLabel={monthLabel} />;
}
