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

export const collectSaleBySellerSchema = z
  .object({
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
    paymentMethod: z.enum(['cash', 'transfer', 'check'], {
      required_error: 'El método de pago es requerido.',
      invalid_type_error: 'Método de pago inválido.',
    }),
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

export type CollectSaleBySellerValues = z.infer<typeof collectSaleBySellerSchema>;
