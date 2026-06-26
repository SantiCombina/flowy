import { z } from 'zod';

export const budgetSchema = z.object({
  clientId: z.number({ invalid_type_error: 'El cliente debe ser un número.' }).optional(),
  clientPhone: z
    .string({ invalid_type_error: 'El teléfono debe ser texto.' })
    .trim()
    .max(50, { message: 'El teléfono debe tener como máximo 50 caracteres.' })
    .optional(),
  items: z
    .array(
      z.object({
        variantId: z
          .number({
            required_error: 'El producto es requerido.',
            invalid_type_error: 'El producto debe ser un número.',
          })
          .min(1, { message: 'Seleccioná un producto.' }),
        quantity: z
          .number({
            required_error: 'La cantidad es requerida.',
            invalid_type_error: 'La cantidad debe ser un número.',
          })
          .int({ message: 'La cantidad debe ser un número entero.' })
          .min(1, { message: 'La cantidad mínima es 1.' }),
        unitPrice: z
          .number({
            required_error: 'El precio es requerido.',
            invalid_type_error: 'El precio debe ser un número.',
          })
          .min(0, { message: 'El precio no puede ser negativo.' }),
      }),
    )
    .min(1, { message: 'Debe agregar al menos un producto.' }),
  notes: z
    .string({ invalid_type_error: 'Las notas deben ser texto.' })
    .trim()
    .max(500, { message: 'Las notas deben tener como máximo 500 caracteres.' })
    .optional(),
  validUntil: z.string({ invalid_type_error: 'La fecha de vencimiento debe ser una fecha válida.' }).optional(),
  saveClientPhone: z
    .boolean({ invalid_type_error: 'El valor de guardar teléfono debe ser verdadero o falso.' })
    .optional(),
});

export type BudgetValues = z.infer<typeof budgetSchema>;
