import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
      invalid_type_error: 'El email debe ser texto',
    })
    .trim()
    .email('El email no es válido')
    .max(200, 'El email no puede superar los 200 caracteres'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
