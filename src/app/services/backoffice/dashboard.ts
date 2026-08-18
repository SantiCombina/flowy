'use server';

import { unstable_cache } from 'next/cache';

import { cacheTags } from '@/lib/cache-tags';
import type { PlanCode } from '@/lib/entitlements/capabilities';
import { getMonthlyPriceUsd } from '@/lib/entitlements/plan-presets';
import { getPayloadClient } from '@/lib/payload';
import type { Notification, PlanVersion, User } from '@/payload-types';

export interface DashboardActivityItem {
  kind: 'notification' | 'signup';
  id: string;
  occurredAt: string;
  title: string;
  body: string;
}

export type BackofficeDashboardStats = {
  mrr: number;
  activeSubscribers: number;
  newSignupsThisMonth: number;
  signupsTrend: Array<{ monthIso: string; label: string; count: number }>;
  activity: DashboardActivityItem[];
  planDistribution: Array<{ planCode: PlanCode; count: number }>;
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;
const PLAN_CODES = ['basic', 'medium', 'professional'] as const;

function resolveOwnerPlanCode(owner: User, planVersions: PlanVersion[]): PlanCode {
  const snapshot = owner.activeEntitlementSnapshot;
  if (!snapshot || typeof snapshot === 'number') return 'basic';
  const planVersion = snapshot.planVersion;
  if (!planVersion || typeof planVersion === 'number') return 'basic';
  const planVersionId = planVersion.id;
  return planVersions.find((entry) => entry.id === planVersionId)?.planCode ?? 'basic';
}

async function computeBackofficeDashboardStats(): Promise<BackofficeDashboardStats> {
  const payload = await getPayloadClient();

  const now = new Date();
  const monthStartIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const twelveMonthsAgoIso = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();

  const [ownersResult, notificationsResult, planVersionsResult] = await Promise.all([
    payload.find({
      collection: 'users',
      where: { and: [{ role: { equals: 'owner' } }, { isDeleted: { not_equals: true } }] },
      limit: 1000,
      depth: 1,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'notifications',
      where: { createdAt: { greater_than: twelveMonthsAgoIso } },
      sort: '-createdAt',
      limit: 50,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'plan-versions',
      where: { planCode: { in: [...PLAN_CODES] } },
      limit: 100,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  const signupsTrend = Array.from({ length: 12 }, (_, idx) => {
    const ref = new Date(now.getFullYear(), now.getMonth() - (11 - idx), 1);
    return {
      monthIso: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTH_LABELS[ref.getMonth()]} ${String(ref.getFullYear()).slice(-2)}`,
      count: 0,
    };
  });
  const bucketMap = new Map(signupsTrend.map((bucket) => [bucket.monthIso, bucket]));

  let activeSubscribers = 0;
  let newSignupsThisMonth = 0;
  const planCounts: Record<PlanCode, number> = { basic: 0, medium: 0, professional: 0 };
  let mrr = 0;
  const ownerSignups: DashboardActivityItem[] = [];

  for (const owner of ownersResult.docs as User[]) {
    if (owner.entitlementState === 'active') {
      activeSubscribers += 1;
      const planCode = resolveOwnerPlanCode(owner, planVersionsResult.docs as PlanVersion[]);
      planCounts[planCode] += 1;
      mrr += getMonthlyPriceUsd(planCode);
    }

    const created = new Date(owner.createdAt);
    const bucketKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    bucketMap.get(bucketKey)!.count += 1;

    if (owner.createdAt >= monthStartIso) {
      newSignupsThisMonth += 1;
      ownerSignups.push({
        kind: 'signup',
        id: `signup-${owner.id}`,
        occurredAt: owner.createdAt,
        title: 'Nuevo tenant',
        body: owner.businessName?.trim() || owner.name || owner.email,
      });
    }
  }

  const notificationsActivity: DashboardActivityItem[] = (notificationsResult.docs as Notification[]).map(
    (notification) => ({
      kind: 'notification',
      id: `notification-${notification.id}`,
      occurredAt: notification.createdAt,
      title: notification.title,
      body: notification.body,
    }),
  );

  const activity = [...ownerSignups, ...notificationsActivity]
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 20);

  return {
    mrr,
    activeSubscribers,
    newSignupsThisMonth,
    signupsTrend,
    activity,
    planDistribution: PLAN_CODES.map((planCode) => ({ planCode, count: planCounts[planCode] })),
  };
}

export async function getBackofficeDashboardStats(): Promise<BackofficeDashboardStats> {
  return unstable_cache(async () => computeBackofficeDashboardStats(), ['admin-backoffice-dashboard'], {
    revalidate: 60,
    tags: [cacheTags.adminBackofficeDashboard()],
  })();
}
