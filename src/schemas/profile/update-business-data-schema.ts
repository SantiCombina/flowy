import { z } from 'zod';

import { phoneSchema } from '@/lib/phone';

export const updateBusinessDataSchema = z.object({
  businessCuit: z
    .string({
      invalid_type_error: 'El CUIT debe ser una cadena de texto.',
    })
    .trim()
    .regex(/^\d{2}-\d{8}-\d{1}$/, { message: 'Formato inválido. Usar XX-XXXXXXXX-X.' })
    .optional()
    .or(z.literal('')),
  businessPhone: phoneSchema.optional().or(z.literal('')),
  businessAddress: z
    .string({
      invalid_type_error: 'El domicilio debe ser una cadena de texto.',
    })
    .trim()
    .max(200, { message: 'Máximo 200 caracteres.' })
    .optional()
    .or(z.literal('')),
  ivaCondition: z
    .enum(['responsable_inscripto', 'monotributista', 'exento', 'no_responsable'], {
      invalid_type_error: 'Condición IVA inválida.',
    })
    .optional(),
});

export type UpdateBusinessDataValues = z.infer<typeof updateBusinessDataSchema>;
