'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';

import { getQueryKeysForCapabilities } from '@/lib/entitlements/cache-invalidation';

export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  function invalidateQueries(queryKeys: QueryKey[]) {
    for (const key of queryKeys) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }

  function invalidateCapabilities(capabilities: readonly string[]) {
    const keys = getQueryKeysForCapabilities(capabilities);
    invalidateQueries(keys);
  }

  return { invalidateQueries, invalidateCapabilities };
}
