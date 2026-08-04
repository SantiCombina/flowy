import { redirect } from 'next/navigation';

import { getCurrentUserWithCapabilities, type GuardedUser } from '@/lib/entitlements/guards';

export async function loadGuardedUser(required?: true): Promise<GuardedUser>;
export async function loadGuardedUser(required: false): Promise<GuardedUser | null>;
export async function loadGuardedUser(required = true): Promise<GuardedUser | null> {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (required && !guardedUser) {
    redirect('/login');
  }

  return guardedUser;
}

export async function loadActiveGuardedUser(): Promise<GuardedUser> {
  const guardedUser = await loadGuardedUser(true);

  if (guardedUser.entitlementState === 'blocked') {
    redirect('/dashboard');
  }

  return guardedUser;
}

export async function loadGuardedUserOrRedirect(path: string): Promise<GuardedUser> {
  const guardedUser = await loadGuardedUser(true);

  if (guardedUser.entitlementState === 'blocked') {
    redirect(path);
  }

  return guardedUser;
}
