import { loadActiveGuardedUser } from '@/app/loaders/entitlements';

export async function loadEntitlementAdmin() {
  const guardedUser = await loadActiveGuardedUser();

  if (guardedUser.user.role !== 'admin') {
    throw new Error('No autorizado');
  }

  return { user: guardedUser.user };
}
