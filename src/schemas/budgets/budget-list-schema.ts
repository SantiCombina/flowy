import { z } from 'zod';

import { ITEMS_PER_PAGE_OPTIONS } from '@/lib/constants/table-columns';

const SORT_COLUMNS = ['date', 'seller', 'client', 'items', 'total', 'status'] as const;

export const getBudgetsListSchema = z.object({
  page: z
    .number({
      invalid_type_error: 'La página debe ser un número.',
    })
    .int('La página debe ser un número entero.')
    .min(1, 'La página debe ser mayor o igual a 1.')
    .default(1),
  limit: z
    .number({
      invalid_type_error: 'El límite debe ser un número.',
    })
    .int('El límite debe ser un número entero.')
    .refine((value) => (ITEMS_PER_PAGE_OPTIONS as readonly number[]).includes(value), {
      message: `El límite debe ser uno de: ${ITEMS_PER_PAGE_OPTIONS.join(', ')}.`,
    })
    .default(ITEMS_PER_PAGE_OPTIONS[0]),
  sort: z
    .enum(SORT_COLUMNS, {
      invalid_type_error: 'La columna de ordenamiento no es válida.',
    })
    .optional(),
  sortDir: z
    .enum(['asc', 'desc'], {
      invalid_type_error: 'La dirección de ordenamiento no es válida.',
    })
    .optional(),
  dateFrom: z
    .string({
      invalid_type_error: 'La fecha de inicio debe ser una cadena de texto.',
    })
    .trim()
    .max(30, 'La fecha de inicio no puede superar los 30 caracteres.')
    .optional()
    .transform((value) => value || undefined),
  dateTo: z
    .string({
      invalid_type_error: 'La fecha de fin debe ser una cadena de texto.',
    })
    .trim()
    .max(30, 'La fecha de fin no puede superar los 30 caracteres.')
    .optional()
    .transform((value) => value || undefined),
  status: z
    .enum(['pending', 'approved', 'rejected', 'converted'], {
      invalid_type_error: 'El estado no es válido.',
    })
    .optional(),
});

export type GetBudgetsListValues = z.infer<typeof getBudgetsListSchema>;
