import type { Metadata } from 'next';

import { getBackofficeDashboardStats } from '@/app/services/backoffice/dashboard';
import { AdminBackofficeDashboard } from '@/components/backoffice/dashboard/admin-backoffice-dashboard';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function AdminDashboardPage() {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser || guardedUser.user.role !== 'admin') {
    return null;
  }

  const initialStats = await getBackofficeDashboardStats();

  return <AdminBackofficeDashboard userName={guardedUser.user.name} initialStats={initialStats} />;
}
