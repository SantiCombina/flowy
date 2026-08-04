import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { assertCapability } from '@/lib/entitlements/guards';

export async function loadMediaUploadContext() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  assertCapability(user, guardedUser.dbSnapshot, 'catalog.manage');

  return { tenantId: user.id };
}
