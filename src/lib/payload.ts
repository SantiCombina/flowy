import { headers } from 'next/headers';
import { getPayload } from 'payload';

import type { User } from '@/payload-types';

import config from '@payload-config';

let cachedPayloadClient: ReturnType<typeof getPayload> | null = null;

export async function getPayloadClient() {
  if (!cachedPayloadClient) {
    cachedPayloadClient = getPayload({ config });
  }
  return cachedPayloadClient;
}

export async function getCurrentUser(): Promise<User | null> {
  const payload = await getPayloadClient();
  const requestHeaders = await headers();

  const { user } = await payload.auth({ headers: requestHeaders });

  return user ?? null;
}
