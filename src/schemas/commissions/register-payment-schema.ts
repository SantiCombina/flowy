import { z } from 'zod';

const COMMISSION_PAYMENT_METHODS = ['transfer', 'cash', 'check'] as const;

export const registerCommissionPaymentSchema = z.object({
  sellerId: z
    .number({
      required_error: 'El vendedor es requerido.',
      invalid_type_error: 'El vendedor debe ser un número.',
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
  date: z
    .string({
      required_error: 'La fecha es requerida.',
      invalid_type_error: 'La fecha debe ser un texto válido.',
    })
    .trim()
    .min(1, { message: 'La fecha es requerida.' }),
  paymentMethod: z.enum(COMMISSION_PAYMENT_METHODS, {
    required_error: 'El método de pago es requerido.',
    invalid_type_error: 'Método de pago inválido.',
  }),
  reference: z
    .string({
      invalid_type_error: 'La referencia debe ser un texto válido.',
    })
    .trim()
    .max(100, { message: 'La referencia no puede superar los 100 caracteres.' })
    .optional()
    .or(z.literal('')),
  notes: z
    .string({
      invalid_type_error: 'Las notas deben ser un texto válido.',
    })
    .trim()
    .max(500, { message: 'Las notas no pueden superar los 500 caracteres.' })
    .optional()
    .or(z.literal('')),
});

export type RegisterCommissionPaymentValues = z.infer<typeof registerCommissionPaymentSchema>;
