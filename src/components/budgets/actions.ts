'use server';

import { z } from 'zod';

import {
  getBudgetOptions,
  getBudgetById,
  getBudgetConvertData,
  createBudget,
  getPaginatedBudgets,
  updateBudgetStatus,
  updateBudget,
  deleteBudget,
  convertBudgetToSale,
} from '@/app/services/budgets';
import { assertUserCapability, hasCapability, resolveUserEntitlementContext } from '@/lib/entitlements/guards';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { getBudgetsListSchema } from '@/schemas/budgets/budget-list-schema';
import { budgetSchema } from '@/schemas/budgets/budget-schema';

export const getBudgetOptionsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
    throw new Error('No autorizado');
  }

  await assertUserCapability(user, 'budget.manage');

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  const sellerId = user.role === 'owner' ? user.id : user.id;
  const options = await getBudgetOptions(sellerId, ownerId);

  return { success: true, ...options };
});

export const createBudgetAction = actionClient.schema(budgetSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
    throw new Error('No autorizado');
  }

  await assertUserCapability(user, 'budget.manage');

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  const entitlementContext = await resolveUserEntitlementContext(user);
  const canUseRecipientPhone = hasCapability(
    user,
    entitlementContext.dbSnapshot,
    'budget.recipient-phone',
    entitlementContext.entitlementState,
  );

  if (!canUseRecipientPhone && (parsedInput.clientPhone || parsedInput.saveClientPhone)) {
    throw new Error('No autorizado');
  }

  const budgetData = canUseRecipientPhone
    ? parsedInput
    : { ...parsedInput, clientPhone: undefined, saveClientPhone: undefined };

  await createBudget(user.id, ownerId, budgetData);

  return { success: true };
});

export const getBudgetsAction = actionClient.schema(getBudgetsListSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autorizado');
  }

  await assertUserCapability(user, 'budget.manage');

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  const filters = {
    dateFrom: parsedInput.dateFrom,
    dateTo: parsedInput.dateTo,
    status: parsedInput.status,
  };

  const options = {
    page: parsedInput.page,
    limit: parsedInput.limit,
    sort: parsedInput.sort,
    sortDir: parsedInput.sortDir,
  };

  const result = await getPaginatedBudgets(ownerId, filters, options);

  return { success: true, ...result };
});

export const getBudgetByIdAction = actionClient
  .schema(z.object({ budgetId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'budget.manage');

    const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

    const budget = await getBudgetById(parsedInput.budgetId, ownerId ?? 0);

    if (!budget) {
      throw new Error('Presupuesto no encontrado');
    }

    return { success: true, budget };
  });

export const updateBudgetStatusAction = actionClient
  .schema(
    z.object({
      budgetId: z.number(),
      status: z.enum(['pending', 'approved', 'rejected', 'converted']),
    }),
  )
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'budget.manage');

    const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

    await updateBudgetStatus(parsedInput.budgetId, parsedInput.status, ownerId ?? 0);

    return { success: true };
  });

export const updateBudgetAction = actionClient
  .schema(z.object({ budgetId: z.number(), data: budgetSchema }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'budget.manage');

    const entitlementContext = await resolveUserEntitlementContext(user);
    const canUseRecipientPhone = hasCapability(
      user,
      entitlementContext.dbSnapshot,
      'budget.recipient-phone',
      entitlementContext.entitlementState,
    );

    if (!canUseRecipientPhone && (parsedInput.data.clientPhone || parsedInput.data.saveClientPhone)) {
      throw new Error('No autorizado');
    }

    const budgetData = canUseRecipientPhone
      ? parsedInput.data
      : { ...parsedInput.data, clientPhone: undefined, saveClientPhone: undefined };

    const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

    await updateBudget(parsedInput.budgetId, budgetData, ownerId ?? 0);

    return { success: true };
  });

export const deleteBudgetAction = actionClient
  .schema(z.object({ budgetId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'budget.manage');

    const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

    await deleteBudget(parsedInput.budgetId, ownerId ?? 0);

    return { success: true };
  });

export const getBudgetConvertDataAction = actionClient
  .schema(z.object({ budgetId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'budget.manage');

    const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

    const data = await getBudgetConvertData(parsedInput.budgetId, user.id, ownerId ?? 0);

    return { success: true, data };
  });

export const convertBudgetAction = actionClient
  .schema(
    z.object({
      budgetId: z.number({
        required_error: 'El ID del presupuesto es requerido.',
        invalid_type_error: 'El ID del presupuesto debe ser un número.',
      }),
      clientId: z.number({ invalid_type_error: 'El cliente debe ser un número.' }).optional(),
      notes: z
        .string({ invalid_type_error: 'Las notas deben ser texto.' })
        .trim()
        .max(500, { message: 'Las notas no pueden superar los 500 caracteres.' })
        .optional(),
      immediateDelivery: z
        .boolean({ invalid_type_error: 'El valor de entrega inmediata debe ser verdadero o falso.' })
        .optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
      throw new Error('No autorizado');
    }

    await assertUserCapability(user, 'budget.manage');
    await assertUserCapability(user, 'sale.create');

    const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;
    if (!ownerId) {
      throw new Error('No se pudo determinar el dueño del negocio');
    }

    await convertBudgetToSale(parsedInput.budgetId, user.id, ownerId, {
      clientId: parsedInput.clientId,
      notes: parsedInput.notes,
      immediateDelivery: parsedInput.immediateDelivery,
    });

    return { success: true };
  });
