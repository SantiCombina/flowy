import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getSellersCommissionSummaries } from '@/app/services/commissions';
import { getVariantsWithProducts } from '@/app/services/products';
import { getSellers } from '@/app/services/users';
import { assertCapability } from '@/lib/entitlements/guards';

export async function loadSellers() {
  const guardedUser = await loadActiveGuardedUser();
  const ownerId = guardedUser.user.role === 'owner' ? guardedUser.user.id : null;

  if (ownerId === null) {
    throw new Error('No autorizado');
  }

  assertCapability(guardedUser.user, guardedUser.dbSnapshot, 'seller.manage');

  const [sellers, variantsResult, commissionSummaries] = await Promise.all([
    getSellers(ownerId),
    getVariantsWithProducts(ownerId, undefined, { limit: 1000 }),
    getSellersCommissionSummaries(ownerId),
  ]);

  return {
    sellers,
    variants: variantsResult.docs,
    commissionSummaries: Object.fromEntries(commissionSummaries),
  };
}
