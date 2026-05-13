'use client';

import { useQuery, type QueryKey, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query';

type ServerActionResult<TData> = {
  data?: TData;
  serverError?: string;
};

export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export function useServerActionQuery<TData>(
  options: {
    queryKey: QueryKey;
    queryFn: () => Promise<ServerActionResult<TData>>;
  } & Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, Error> {
  const { queryKey, queryFn, ...rest } = options;

  return useQuery({
    queryKey,
    queryFn: async () => {
      const result = await queryFn();
      if (result.serverError) {
        throw new BusinessError(result.serverError);
      }
      if (result.data === undefined) {
        throw new Error('No se recibieron datos del servidor');
      }
      return result.data;
    },
    retry: (failureCount, error) => {
      if (error instanceof BusinessError) return false;
      return failureCount < 3;
    },
    ...rest,
  });
}
