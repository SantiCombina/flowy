import { z } from 'zod';

export const markAsDeliveredSchema = z.object({
  saleId: z
    .number({
      required_error: 'El ID de la venta es requerido.',
      invalid_type_error: 'El ID de la venta debe ser un número.',
    })
    .int()
    .positive(),
});

export type MarkAsDeliveredValues = z.infer<typeof markAsDeliveredSchema>;
