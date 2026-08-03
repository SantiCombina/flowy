import type { QueryKey } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

const capabilityQueryKeyMap: Record<string, QueryKey[]> = {
  'catalog.manage': [['products']],
  'client.manage': [queryKeys.clients.list()],
  'client.delete': [queryKeys.clients.list()],
  'client.contact-fields': [queryKeys.clients.list()],
  'zones.manage': [queryKeys.zones.list()],
  'seller.invite': [queryKeys.sellers.list()],
  'seller.dispatch': [queryKeys.mobileInventory.forSeller(undefined)],
  'inventory.mobile': [queryKeys.mobileInventory.forSeller(undefined), ['saleOptions']],
  'sale.create': [['sales'], ['saleOptions']],
  'sale.credit': [['sales']],
  'budget.create': [['budgets'], queryKeys.budgets.options()],
  'budget.recipient-phone': [['budgets']],
};

export function getQueryKeysForCapabilities(capabilities: readonly string[]): QueryKey[] {
  const keys: QueryKey[] = [];
  const seen = new Set<string>();

  for (const capability of capabilities) {
    const mapped = capabilityQueryKeyMap[capability];
    if (!mapped) continue;

    for (const key of mapped) {
      const serialized = JSON.stringify(key);
      if (seen.has(serialized)) continue;
      seen.add(serialized);
      keys.push(key);
    }
  }

  return keys;
}
