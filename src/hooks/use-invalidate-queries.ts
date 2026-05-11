'use client';

import { useQueryClient, type QueryKey } from '@tanstack/react-query';

export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  function invalidateQueries(queryKeys: QueryKey[]) {
    for (const key of queryKeys) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  }

  return { invalidateQueries };
}
