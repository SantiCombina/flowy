'use server';

import { getPriceList } from '@/app/services/price-list';
import { assertUserCapability } from '@/lib/entitlements/guards';
import {
  MODULE_ACCESS,
  resolveModuleCapability,
  resolveProductsTenantId,
} from '@/lib/entitlements/module-access';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';

export const getPriceListAction = actionClient.action(async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  const ownerId = resolveProductsTenantId(user);
  if (ownerId === null) throw new Error('No autorizado');
  const productCapability = resolveModuleCapability(MODULE_ACCESS['/products'], user.role);
  if (!productCapability) throw new Error('No autorizado');
  await assertUserCapability(user, productCapability);
  return { success: true, priceList: await getPriceList(ownerId) };
});
