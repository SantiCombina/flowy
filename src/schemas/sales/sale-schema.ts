import { z } from 'zod';

export const saleSchema = z
  .object({
    clientId: z.number({ invalid_type_error: 'El cliente debe ser un número.' }).optional(),
    paymentMethod: z.enum(['cash', 'transfer', 'check', 'credit'], {
      required_error: 'El método de pago es requerido.',
      invalid_type_error: 'Método de pago inválido.',
    }),
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
          stockSource: z.enum(['warehouse', 'personal'], {
            required_error: 'El origen de stock es requerido.',
            invalid_type_error: 'Origen de stock inválido.',
          }),
        }),
      )
      .min(1, { message: 'Debe agregar al menos un producto.' }),
    notes: z
      .string({ invalid_type_error: 'Las notas deben ser texto.' })
      .trim()
      .max(500, { message: 'Las notas deben tener como máximo 500 caracteres.' })
      .optional(),
    checkDueDate: z.string({ invalid_type_error: 'La fecha de cobro debe ser una fecha válida.' }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'check' && !data.checkDueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha de cobro del cheque es requerida.',
        path: ['checkDueDate'],
      });
    }
  });

export type SaleValues = z.infer<typeof saleSchema>;
