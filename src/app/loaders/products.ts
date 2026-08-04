import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import {
  getProducts,
  getVariantsWithProducts,
  type ProductFilters,
  type VariantFilters,
} from '@/app/services/products';
import { resolveProductsTenantId } from '@/lib/entitlements/module-access';

export async function loadProducts(
  filters?: ProductFilters,
  options?: { limit?: number; page?: number; sort?: string },
) {
  const guardedUser = await loadActiveGuardedUser();
  const ownerId = resolveProductsTenantId(guardedUser.user);

  if (ownerId === null) {
    throw new Error('No autorizado');
  }

  return getProducts(ownerId, filters, options);
}

export async function loadVariantsWithProducts(
  filters?: VariantFilters,
  options?: { limit?: number; page?: number; sort?: string },
) {
  const guardedUser = await loadActiveGuardedUser();
  const ownerId = resolveProductsTenantId(guardedUser.user);

  if (ownerId === null) {
    throw new Error('No autorizado');
  }

  return getVariantsWithProducts(ownerId, filters, options);
}
