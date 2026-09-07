import { z } from 'zod';

export const bulkUpdatePricesSchema = z.object({
  updates: z
    .array(
      z.object({
        variantId: z.number({
          required_error: 'ID de variante requerido',
          invalid_type_error: 'ID de variante inválido',
        }),
        costPrice: z
          .number({
            required_error: 'Precio de costo requerido',
            invalid_type_error: 'El precio debe ser un número',
          })
          .min(0, 'El precio no puede ser negativo')
          .max(9999999, 'El precio no puede superar $9.999.999'),
      }),
    )
    .min(1, 'Debe seleccionar al menos una variante'),
});

export type BulkUpdatePricesValues = z.infer<typeof bulkUpdatePricesSchema>;
