import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard',
};

import { getOwnerDashboardStats, getSellerDashboardStats } from '@/app/services/dashboard';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { getCurrentUser } from '@/lib/payload';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'owner' || user.role === 'admin') {
    const initialStats = await getOwnerDashboardStats(user.id, 'month');
    return <DashboardShell kind="owner" userId={user.id} userName={user.name} initialStats={initialStats} />;
  }

  const ownerRef = user.owner;
  const ownerId = typeof ownerRef === 'object' && ownerRef !== null ? ownerRef.id : (ownerRef ?? 0);
  const initialStats = await getSellerDashboardStats(user.id, ownerId, 'month');
  return (
    <DashboardShell kind="seller" userId={user.id} ownerId={ownerId} userName={user.name} initialStats={initialStats} />
  );
}
