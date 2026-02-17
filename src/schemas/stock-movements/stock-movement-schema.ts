import { z } from 'zod';

export const registerStockMovementSchema = z.object({
  variantId: z
    .number({
      required_error: 'El ID de la variante es requerido.',
      invalid_type_error: 'El ID de la variante debe ser un número.',
    })
    .positive({
      message: 'ID de variante inválido.',
    }),
  type: z.enum(['entry', 'exit', 'adjustment'], {
    required_error: 'El tipo de movimiento es requerido.',
    invalid_type_error: 'El tipo de movimiento debe ser entry, exit o adjustment.',
  }),
  quantity: z
    .number({
      required_error: 'La cantidad es requerida.',
      invalid_type_error: 'La cantidad debe ser un número.',
    })
    .positive({
      message: 'La cantidad debe ser mayor a 0.',
    }),
  reason: z
    .string({
      invalid_type_error: 'La razón debe ser una cadena de texto.',
    })
    .optional(),
});

export type RegisterStockMovementValues = z.infer<typeof registerStockMovementSchema>;
