import { loadActiveGuardedUser } from '@/app/loaders/entitlements';
import { getPaginatedBudgets, type BudgetListFilters, type BudgetListOptions } from '@/app/services/budgets';
import { assertGuardedUserCapability } from '@/lib/entitlements/guards';
import { resolveId } from '@/lib/payload-utils';

export async function loadBudgets(filters: BudgetListFilters, options: BudgetListOptions) {
  const guardedUser = await loadActiveGuardedUser();
  const user = guardedUser.user;

  if (user.role !== 'owner' && user.role !== 'seller') {
    throw new Error('No autorizado');
  }

  assertGuardedUserCapability(guardedUser, 'budget.manage');

  const ownerId = user.role === 'owner' ? user.id : (resolveId(user.owner) ?? 0);

  if (ownerId === 0) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  return getPaginatedBudgets(ownerId, filters, options);
}
