import { z } from 'zod';

const SORT_COLUMNS = [
  'date',
  'seller',
  'client',
  'items',
  'total',
  'paymentMethod',
  'paymentStatus',
  'deliveryStatus',
  'zone',
] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const getSalesListSchema = z.object({
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
    .refine((value) => [25, 50, 100].includes(value), {
      message: 'El límite debe ser 25, 50 o 100.',
    })
    .default(25),
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
    .max(10, 'La fecha de inicio no puede superar los 10 caracteres.')
    .regex(DATE_REGEX, 'La fecha de inicio debe tener formato YYYY-MM-DD.')
    .optional()
    .transform((value) => value || undefined),
  dateTo: z
    .string({
      invalid_type_error: 'La fecha de fin debe ser una cadena de texto.',
    })
    .trim()
    .max(10, 'La fecha de fin no puede superar los 10 caracteres.')
    .regex(DATE_REGEX, 'La fecha de fin debe tener formato YYYY-MM-DD.')
    .optional()
    .transform((value) => value || undefined),
  paymentStatus: z
    .enum(['pending', 'collected'], {
      invalid_type_error: 'El estado de cobro no es válido.',
    })
    .optional(),
  zone: z
    .number({
      invalid_type_error: 'La zona debe ser un número.',
    })
    .int('La zona debe ser un número entero.')
    .positive('La zona debe ser mayor a cero.')
    .optional(),
  paymentMethod: z
    .enum(['cash', 'transfer', 'check', '__credit__'], {
      invalid_type_error: 'El método de pago no es válido.',
    })
    .optional(),
  deliveryStatus: z
    .enum(['pending', 'delivered'], {
      invalid_type_error: 'El estado de entrega no es válido.',
    })
    .optional(),
});

export type GetSalesListValues = z.infer<typeof getSalesListSchema>;
