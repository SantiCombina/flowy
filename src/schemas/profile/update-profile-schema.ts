import { z } from 'zod';

import { phoneSchema } from '@/lib/phone';

export const updateProfileSchema = z.object({
  phone: phoneSchema.optional().or(z.literal('')),
  dni: z
    .string({
      invalid_type_error: 'El DNI debe ser una cadena de texto.',
    })
    .trim()
    .regex(/^\d{7,8}$/, { message: 'El DNI debe tener 7 u 8 dígitos.' })
    .optional()
    .or(z.literal('')),
  cuitCuil: z
    .string({
      invalid_type_error: 'El CUIT/CUIL debe ser una cadena de texto.',
    })
    .trim()
    .regex(/^\d{2}-\d{8}-\d{1}$/, { message: 'Formato inválido. Usar XX-XXXXXXXX-X.' })
    .optional()
    .or(z.literal('')),
  cbu: z
    .string({
      invalid_type_error: 'El CBU/Alias debe ser una cadena de texto.',
    })
    .trim()
    .max(50, { message: 'Máximo 50 caracteres.' })
    .optional()
    .or(z.literal('')),
});

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
