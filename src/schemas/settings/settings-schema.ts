import { z } from 'zod';

import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';

export const updateTableColumnsSchema = z.object({
  tableName: z.enum(['products', 'clients', 'sales', 'assignments', 'history', 'sellers'], {
    required_error: 'El nombre de la tabla es requerido.',
    invalid_type_error: 'El nombre de la tabla debe ser un valor válido.',
  }),
  columns: z
    .array(
      z.string({
        required_error: 'Cada columna debe ser una cadena de texto.',
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
      {
        required_error: 'Las columnas son requeridas.',
        invalid_type_error: 'Las columnas deben ser un array.',
      },
    )
    .min(1, {
      message: 'Debe seleccionar al menos una columna.',
    }),
});

export type UpdateTableColumnsValues = z.infer<typeof updateTableColumnsSchema>;

export const updateItemsPerPageSchema = z.object({
  itemsPerPage: z.enum(ITEMS_PER_PAGE_OPTIONS.map((v) => v.toString()) as [string, string, string, string], {
    required_error: 'Los elementos por página son requeridos.',
    invalid_type_error: 'Los elementos por página deben ser un valor válido.',
  }),
});

export type UpdateItemsPerPageValues = z.infer<typeof updateItemsPerPageSchema>;

export const updateSettingsSchema = z.object({
  productsColumns: z
    .array(
      z.string({
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
    )
    .optional(),
  clientsColumns: z
    .array(
      z.string({
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
    )
    .optional(),
  salesColumns: z
    .array(
      z.string({
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
    )
    .optional(),
  assignmentsColumns: z
    .array(
      z.string({
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
    )
    .optional(),
  historyColumns: z
    .array(
      z.string({
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
    )
    .optional(),
  sellersColumns: z
    .array(
      z.string({
        invalid_type_error: 'Cada columna debe ser una cadena de texto.',
      }),
    )
    .optional(),
  itemsPerPage: z
    .string({
      invalid_type_error: 'Los elementos por página deben ser una cadena de texto.',
    })
    .optional(),
});

export type UpdateSettingsValues = z.infer<typeof updateSettingsSchema>;
