import { z } from 'zod';

export const editSaleSchema = z.object({
  saleId: z.number({
    required_error: 'ID de venta requerido',
    invalid_type_error: 'ID de venta inválido',
  }),
  notes: z
    .string({ invalid_type_error: 'Las notas deben ser texto' })
    .trim()
    .max(500, 'Las notas no pueden superar los 500 caracteres')
    .optional(),
  clientId: z
    .number({ invalid_type_error: 'El cliente debe ser un número' })
    .nullable()
    .optional(),
});

export type EditSaleValues = z.infer<typeof editSaleSchema>;
