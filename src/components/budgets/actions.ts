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
} from '@/app/services/budgets';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { getBudgetsListSchema } from '@/schemas/budgets/budget-list-schema';
import { budgetSchema } from '@/schemas/budgets/budget-schema';

export const getBudgetOptionsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
    throw new Error('No autorizado');
  }

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

  const ownerId = user.role === 'owner' ? user.id : typeof user.owner === 'number' ? user.owner : user.owner?.id;

  if (!ownerId) {
    throw new Error('No se pudo determinar el dueño del negocio');
  }

  await createBudget(user.id, ownerId, parsedInput);

  return { success: true };
});

export const getBudgetsAction = actionClient.schema(getBudgetsListSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autorizado');
  }

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

    const budget = await getBudgetById(parsedInput.budgetId);

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

    await updateBudgetStatus(parsedInput.budgetId, parsedInput.status);

    return { success: true };
  });

export const updateBudgetAction = actionClient
  .schema(z.object({ budgetId: z.number(), data: budgetSchema }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
      throw new Error('No autorizado');
    }

    await updateBudget(parsedInput.budgetId, parsedInput.data);

    return { success: true };
  });

export const deleteBudgetAction = actionClient
  .schema(z.object({ budgetId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'owner' && user.role !== 'seller')) {
      throw new Error('No autorizado');
    }

    await deleteBudget(parsedInput.budgetId);

    return { success: true };
  });

export const getBudgetConvertDataAction = actionClient
  .schema(z.object({ budgetId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'seller' && user.role !== 'owner')) {
      throw new Error('No autorizado');
    }

    const data = await getBudgetConvertData(parsedInput.budgetId, user.id);

    return { success: true, data };
  });
