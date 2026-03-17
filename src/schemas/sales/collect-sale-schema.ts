import { z } from 'zod';

export const collectSaleSchema = z.object({
  saleId: z
    .number({
      required_error: 'El ID de la venta es requerido.',
      invalid_type_error: 'El ID de la venta debe ser un número.',
    })
    .int()
    .positive(),
  amount: z
    .number({
      required_error: 'El monto es requerido.',
      invalid_type_error: 'El monto debe ser un número.',
    })
    .positive({ message: 'El monto debe ser mayor a cero.' })
    .max(999_999_999, { message: 'El monto ingresado es demasiado alto.' }),
});

export type CollectSaleValues = z.infer<typeof collectSaleSchema>;
