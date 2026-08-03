type CacheInput = boolean | number | string | null | readonly CacheInput[] | { readonly [key: string]: CacheInput };

interface EntitlementCacheKeyInput {
  userId: string;
  snapshotId: string;
  operation: string;
  inputs: CacheInput;
}

function isCacheRecord(value: CacheInput): value is { readonly [key: string]: CacheInput } {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function serializeCacheInput(value: CacheInput): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeCacheInput).join(',')}]`;
  }

  if (isCacheRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeCacheInput(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function createEntitlementCacheKey({ userId, snapshotId, operation, inputs }: EntitlementCacheKeyInput): string {
  return serializeCacheInput({ userId, snapshotId, operation, inputs });
}
