import { TABLE_COLUMNS } from '@/lib/constants/table-columns';

export {
  updateTableColumnsSchema,
  type UpdateTableColumnsValues,
  updateItemsPerPageSchema,
  type UpdateItemsPerPageValues,
  updateSettingsSchema,
  type UpdateSettingsValues,
} from '@/schemas/settings/settings-schema';

export function validateColumnsForTable(tableName: keyof typeof TABLE_COLUMNS, columns: string[]): boolean {
  const validColumns = TABLE_COLUMNS[tableName];
  return columns.every((col) => validColumns.includes(col as never));
}
