import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido', invalid_type_error: 'El nombre debe ser texto' })
    .trim()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z
    .string({ required_error: 'El email es requerido', invalid_type_error: 'El email debe ser texto' })
    .trim()
    .min(1, 'El email es requerido')
    .email('El email no es válido')
    .max(255, 'El email no puede superar los 255 caracteres'),
  message: z
    .string({ required_error: 'El mensaje es requerido', invalid_type_error: 'El mensaje debe ser texto' })
    .trim()
    .min(1, 'El mensaje es requerido')
    .max(2000, 'El mensaje no puede superar los 2000 caracteres'),
});

export type ContactValues = z.infer<typeof contactSchema>;
