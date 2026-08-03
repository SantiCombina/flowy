import { z } from 'zod';

export const convertBudgetSchema = z.object({
  budgetId: z.number({
    required_error: 'El ID del presupuesto es requerido.',
    invalid_type_error: 'El ID del presupuesto debe ser un número.',
  }),
  clientId: z.number({ invalid_type_error: 'El cliente debe ser un número.' }).optional(),
  notes: z
    .string({ invalid_type_error: 'Las notas deben ser texto.' })
    .trim()
    .max(500, { message: 'Las notas no pueden superar los 500 caracteres.' })
    .optional(),
  immediateDelivery: z
    .boolean({ invalid_type_error: 'El valor de entrega inmediata debe ser verdadero o falso.' })
    .optional(),
});

export type ConvertBudgetValues = z.infer<typeof convertBudgetSchema>;
