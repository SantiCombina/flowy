import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getPaginatedSales, type SalesListFilters, type SalesListOptions } from '@/app/services/sales';
import { getZones } from '@/app/services/zones';
import { assertGuardedUserCapability } from '@/lib/entitlements/guards';
import { resolveId } from '@/lib/payload-utils';

export async function loadSales(filters: SalesListFilters, options: SalesListOptions) {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'owner' && user.role !== 'seller') {
    throw new Error('No autorizado');
  }

  assertGuardedUserCapability(guardedUser, 'sale.create');

  const ownerId = user.role === 'owner' ? user.id : (resolveId(user.owner) ?? 0);

  if (ownerId === 0) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  const scope = user.role === 'owner' ? { ownerId: user.id } : { sellerId: user.id };

  const [zones, result] = await Promise.all([getZones(ownerId), getPaginatedSales(scope, filters, options)]);

  return { zones, result };
}
