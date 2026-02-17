import { z } from 'zod';

export const inviteSellerSchema = z.object({
  name: z
    .string({
      required_error: 'El nombre es requerido.',
      invalid_type_error: 'El nombre debe ser una cadena de texto.',
    })
    .trim()
    .min(1, {
      message: 'El nombre es requerido.',
    })
    .max(100, {
      message: 'El nombre debe tener como máximo 100 caracteres.',
    }),
  email: z
    .string({
      required_error: 'El email es requerido.',
      invalid_type_error: 'El email debe ser una cadena de texto.',
    })
    .trim()
    .email({
      message: 'Por favor ingresa una dirección de email válida.',
    }),
});

export type InviteSellerValues = z.infer<typeof inviteSellerSchema>;
