export interface FeatureFlags {
  products: boolean;
  sellers: boolean;
  assignments: boolean;
  clients: boolean;
  history: boolean;
  sales: boolean;
  settings: boolean;
}

export function getFeatureFlags(): FeatureFlags {
  return {
    products: process.env.FEATURE_PRODUCTS === 'true',
    sellers: process.env.FEATURE_SELLERS === 'true',
    assignments: process.env.FEATURE_ASSIGNMENTS === 'true',
    clients: process.env.FEATURE_CLIENTS === 'true',
    history: process.env.FEATURE_HISTORY === 'true',
    sales: process.env.FEATURE_SALES === 'true',
    settings: process.env.FEATURE_SETTINGS === 'true',
  };
}
