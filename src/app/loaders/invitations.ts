import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getSellers } from '@/app/services/users';
import { assertCapability } from '@/lib/entitlements/guards';

export async function loadInvitations() {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  assertCapability(user, guardedUser.dbSnapshot, 'seller.invite');

  const sellers = await getSellers(user.id);

  return { sellers };
}
