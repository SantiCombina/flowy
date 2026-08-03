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
  },
  {
    planCode: 'medium',
    capabilities: planCapabilities('medium'),
    quotas: { ...sharedCatalogQuotas, maxSellerSeats: 2 },
  },
  {
    planCode: 'professional',
    capabilities: planCapabilities('professional'),
    quotas: { ...sharedCatalogQuotas, maxSellerSeats: 9 },
  },
] as const;
