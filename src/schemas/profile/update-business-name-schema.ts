import { z } from 'zod';

export const updateBusinessNameSchema = z.object({
  businessName: z
    .string({
      required_error: 'El nombre del negocio es requerido.',
      invalid_type_error: 'El nombre del negocio debe ser una cadena de texto.',
    })
    .trim()
    .min(1, { message: 'El nombre del negocio no puede estar vacío.' })
    .max(100, { message: 'El nombre del negocio debe tener como máximo 100 caracteres.' }),
});

export type UpdateBusinessNameValues = z.infer<typeof updateBusinessNameSchema>;
