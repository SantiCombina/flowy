import {
  DEFAULT_COLUMNS,
  DEFAULT_ITEMS_PER_PAGE,
  ITEMS_PER_PAGE_OPTIONS,
  type ItemsPerPageOption,
  type TableName,
} from '@/lib/constants/table-columns';
import { getPayloadClient } from '@/lib/payload';
import type { Setting } from '@/payload-types';

interface SettingsColumns {
  productsColumns?: { column: string }[];
  clientsColumns?: { column: string }[];
  salesColumns?: { column: string }[];
  assignmentsColumns?: { column: string }[];
  historyColumns?: { column: string }[];
  sellersColumns?: { column: string }[];
  budgetsColumns?: { column: string }[];
}

export type ColumnsConfig = Record<TableName, string[]>;

/**
 * Obtiene las configuraciones del usuario, o crea una nueva con valores por defecto
 */
export async function getSettings(userId: number): Promise<Setting> {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: 'settings',
    where: { user: { equals: userId } },
    limit: 1,
  });

  if (docs[0]) {
    return docs[0];
  }

  try {
    const settings = await payload.create({
      collection: 'settings',
      data: {
        user: userId,
        productsColumns: DEFAULT_COLUMNS.products.map((col) => ({
          column: col,
        })),
        clientsColumns: DEFAULT_COLUMNS.clients.map((col) => ({ column: col })),
        salesColumns: DEFAULT_COLUMNS.sales.map((col) => ({ column: col })),
        assignmentsColumns: DEFAULT_COLUMNS.assignments.map((col) => ({
          column: col,
        })),
        historyColumns: DEFAULT_COLUMNS.history.map((col) => ({ column: col })),
        sellersColumns: DEFAULT_COLUMNS.sellers.map((col) => ({ column: col })),
        itemsPerPage: DEFAULT_ITEMS_PER_PAGE.toString() as Setting['itemsPerPage'],
      },
    });

    return settings;
  } catch (error) {
    const { docs: retryDocs } = await payload.find({
      collection: 'settings',
      where: { user: { equals: userId } },
      limit: 1,
    });

    if (retryDocs[0]) {
      return retryDocs[0];
    }

    throw error;
  }
}

/**
 * Actualiza las configuraciones del usuario
 */
export async function updateSettings(userId: number, data: Partial<Setting>): Promise<Setting> {
  const payload = await getPayloadClient();

  const settings = await getSettings(userId);

  const updated = await payload.update({
    collection: 'settings',
    id: settings.id,
    data,
  });

  return updated;
}

/**
 * Actualiza las columnas visibles de una tabla específica
 */
export async function updateTableColumns(userId: number, tableName: TableName, columns: string[]): Promise<Setting> {
  const payload = await getPayloadClient();
  const settings = await getSettings(userId);

  const fieldName = `${tableName}Columns` as const;
  const arrayData = columns.map((col) => ({ column: col }));

  const updated = await payload.update({
    collection: 'settings',
    id: settings.id,
    data: {
      [fieldName]: arrayData,
    },
  });

  return updated;
}

/**
 * Extrae las columnas visibles de una tabla desde las settings
 */
export function getVisibleColumns(settings: Setting | null, tableName: TableName): string[] {
  if (!settings) {
    return DEFAULT_COLUMNS[tableName];
  }

  const fieldName = `${tableName}Columns` as keyof SettingsColumns;
  const columnsArray = settings[fieldName as keyof Setting] as { column: string }[] | undefined;

  if (!columnsArray || columnsArray.length === 0) {
    return DEFAULT_COLUMNS[tableName];
  }

  return columnsArray.map((item) => item.column);
}

/**
 * Verifica si una columna específica debe mostrarse
 */
export function isColumnVisible(settings: Setting | null, tableName: TableName, columnKey: string): boolean {
  const visibleColumns = getVisibleColumns(settings, tableName);
  return visibleColumns.includes(columnKey);
}

/**
 * Obtiene la preferencia de elementos por página
 */
export function getItemsPerPage(settings: Setting | null): ItemsPerPageOption {
  if (!settings?.itemsPerPage) {
    return DEFAULT_ITEMS_PER_PAGE;
  }

  const value = parseInt(settings.itemsPerPage, 10);
  return ITEMS_PER_PAGE_OPTIONS.includes(value as ItemsPerPageOption)
    ? (value as ItemsPerPageOption)
    : DEFAULT_ITEMS_PER_PAGE;
}

/**
 * Obtiene todas las columnas configuradas como objeto
 */
export function getAllColumnsConfig(settings: Setting | null): ColumnsConfig {
  return {
    products: getVisibleColumns(settings, 'products'),
    clients: getVisibleColumns(settings, 'clients'),
    sales: getVisibleColumns(settings, 'sales'),
    assignments: getVisibleColumns(settings, 'assignments'),
    history: getVisibleColumns(settings, 'history'),
    sellers: getVisibleColumns(settings, 'sellers'),
    budgets: getVisibleColumns(settings, 'budgets'),
  };
}
