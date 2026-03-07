import { redirect } from 'next/navigation';

import type { Period } from '@/app/services/dashboard';
import { getOwnerDashboardStats, getSellerDashboardStats } from '@/app/services/dashboard';
import { OwnerDashboard } from '@/components/dashboard/owner-dashboard';
import { SellerDashboard } from '@/components/dashboard/seller-dashboard';
import { getCurrentUser } from '@/lib/payload';

const VALID_PERIODS: Period[] = ['day', 'week', 'month', 'year'];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { period: rawPeriod } = await searchParams;
  const period: Period = VALID_PERIODS.includes(rawPeriod as Period) ? (rawPeriod as Period) : 'month';

  if (user.role === 'owner' || user.role === 'admin') {
    const stats = await getOwnerDashboardStats(user.id, period);
    return <OwnerDashboard stats={stats} userName={user.name} period={period} />;
  }

  const ownerRef = user.owner;
  const ownerId = typeof ownerRef === 'object' && ownerRef !== null ? ownerRef.id : (ownerRef ?? 0);
  const stats = await getSellerDashboardStats(user.id, ownerId, period);
  return <SellerDashboard stats={stats} userName={user.name} period={period} />;
}
