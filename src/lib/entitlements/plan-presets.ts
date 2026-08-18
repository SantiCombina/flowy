import type { PlanCode } from './capabilities';
import { planCapabilities } from './quotas';

const sharedCatalogQuotas = {
  maxProducts: 2000,
  maxVariantsPerProduct: 20,
  maxVariantsPerTenant: 2000,
} as const;

export const PLAN_PRESETS = [
  {
    planCode: 'basic',
    capabilities: planCapabilities('basic'),
    quotas: { ...sharedCatalogQuotas, maxSellerSeats: 0 },
    monthlyPriceUsd: 20,
  },
  {
    planCode: 'medium',
    capabilities: planCapabilities('medium'),
    quotas: { ...sharedCatalogQuotas, maxSellerSeats: 2 },
    monthlyPriceUsd: 60,
  },
  {
    planCode: 'professional',
    capabilities: planCapabilities('professional'),
    quotas: { ...sharedCatalogQuotas, maxSellerSeats: 9 },
    monthlyPriceUsd: 150,
  },
] as const;

export function getMonthlyPriceUsd(planCode: PlanCode): number {
  const preset = PLAN_PRESETS.find((entry) => entry.planCode === planCode);
  return preset?.monthlyPriceUsd ?? 0;
}
