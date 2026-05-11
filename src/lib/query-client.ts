import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000,
        gcTime: 300000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
}
