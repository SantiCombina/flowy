'use server';

import {
  getSettings,
  updateTableColumns as updateTableColumnsService,
  updateSettings as updateSettingsService,
  getAllColumnsConfig,
} from '@/app/services/settings';
import { DEFAULT_ITEMS_PER_PAGE } from '@/lib/constants/table-columns';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import type { Setting } from '@/payload-types';

import { updateTableColumnsSchema, updateItemsPerPageSchema, validateColumnsForTable } from './schemas';

export const getSettingsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autenticado');
  }

  const settings = await getSettings(user.id);

  return {
    success: true,
    settings: {
      id: settings.id,
      productsColumns: settings.productsColumns?.map((c) => c.column) ?? [],
      clientsColumns: settings.clientsColumns?.map((c) => c.column) ?? [],
      salesColumns: settings.salesColumns?.map((c) => c.column) ?? [],
      assignmentsColumns: settings.assignmentsColumns?.map((c) => c.column) ?? [],
      historyColumns: settings.historyColumns?.map((c) => c.column) ?? [],
      sellersColumns: settings.sellersColumns?.map((c) => c.column) ?? [],
      budgetsColumns: settings.budgetsColumns?.map((c) => c.column) ?? [],
      itemsPerPage: settings.itemsPerPage ?? (DEFAULT_ITEMS_PER_PAGE.toString() as Setting['itemsPerPage']),
    },
  };
});

export const updateTableColumnsAction = actionClient
  .schema(updateTableColumnsSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    if (!validateColumnsForTable(parsedInput.tableName, parsedInput.columns)) {
      throw new Error('Columnas inválidas para esta tabla');
    }

    const settings = await updateTableColumnsService(user.id, parsedInput.tableName, parsedInput.columns);

    return {
      success: true,
      columns: settings[`${parsedInput.tableName}Columns` as keyof typeof settings],
    };
  });

export const updateItemsPerPageAction = actionClient
  .schema(updateItemsPerPageSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    const settings = await updateSettingsService(user.id, {
      itemsPerPage: parsedInput.itemsPerPage as Setting['itemsPerPage'],
    });

    return {
      success: true,
      itemsPerPage: settings.itemsPerPage,
    };
  });

export const getVisibleColumnsAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autenticado');
  }

  const settings = await getSettings(user.id);
  const config = getAllColumnsConfig(settings);

  return {
    success: true,
    config,
  };
});
