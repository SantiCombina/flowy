import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio', invalid_type_error: 'El nombre debe ser texto' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z
    .string({ required_error: 'El email es obligatorio', invalid_type_error: 'El email debe ser texto' })
    .trim()
    .min(1, 'El email es obligatorio')
    .email('El email ingresado no es válido')
    .max(255, 'El email no puede superar los 255 caracteres'),
  business: z
    .string({ invalid_type_error: 'El nombre del negocio debe ser texto' })
    .trim()
    .max(200, 'El nombre del negocio no puede superar los 200 caracteres')
    .optional()
    .or(z.literal('')),
  message: z
    .string({ invalid_type_error: 'El mensaje debe ser texto' })
    .trim()
    .max(2000, 'El mensaje no puede superar los 2000 caracteres')
    .optional()
    .or(z.literal('')),
});

export type ContactValues = z.infer<typeof contactSchema>;
