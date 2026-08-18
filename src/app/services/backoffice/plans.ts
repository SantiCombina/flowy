'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { publishPlanVersion as publishPlanVersionEntitlement } from '@/app/services/entitlements';
import { cacheTags } from '@/lib/cache-tags';
import { CAPABILITIES, type PlanCode } from '@/lib/entitlements/capabilities';
import { getPayloadClient } from '@/lib/payload';
import type { PlanVersion } from '@/payload-types';

export interface PlanVersionSummary {
  id: number;
  version: number;
  capabilities: string[];
  quotas: {
    maxSellerSeats: number;
    maxProducts: number;
    maxVariantsPerProduct: number;
    maxVariantsPerTenant: number;
  };
  publishedAt: string;
  createdBy: number | null;
}

export interface PlanVersionsByCode {
  basic: PlanVersionSummary[];
  medium: PlanVersionSummary[];
  professional: PlanVersionSummary[];
}

export async function listPlanVersions(): Promise<PlanVersionsByCode> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'plan-versions',
    sort: '-version',
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });

  const grouped: PlanVersionsByCode = { basic: [], medium: [], professional: [] };

  for (const version of result.docs as PlanVersion[]) {
    const summary: PlanVersionSummary = {
      id: version.id,
      version: version.version,
      capabilities: version.capabilities.map((entry) => entry.capability),
      quotas: { ...version.quotas },
      publishedAt: version.publishedAt,
      createdBy: typeof version.createdBy === 'number' ? version.createdBy : (version.createdBy?.id ?? null),
    };
    grouped[version.planCode].push(summary);
  }

  return grouped;
}

export interface PublishPlanVersionInput {
  planCode: PlanCode;
  capabilities: readonly { capability: (typeof CAPABILITIES)[number] }[];
  quotas: {
    maxSellerSeats: number;
    maxProducts: number;
    maxVariantsPerProduct: number;
    maxVariantsPerTenant: number;
  };
  createdBy: number;
}

export async function publishPlanVersion(input: PublishPlanVersionInput): Promise<void> {
  await publishPlanVersionEntitlement(input.planCode, input.capabilities, input.quotas, input.createdBy);

  revalidatePath('/backoffice/plans');
  revalidateTag(cacheTags.adminBackofficePlans());
  revalidateTag(cacheTags.adminBackofficeDashboard());
}
