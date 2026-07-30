import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
      invalid_type_error: 'El email debe ser texto',
    })
    .trim()
    .email('El email no es válido'),
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser texto',
    })
    .min(1, 'La contraseña es requerida'),
});

export type LoginValues = z.infer<typeof loginSchema>;
