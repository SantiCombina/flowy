import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido.',
      invalid_type_error: 'El email debe ser una cadena de texto.',
    })
    .trim()
    .email({
      message: 'Por favor ingresa una dirección de email válida.',
    }),
  password: z
    .string({
      required_error: 'La contraseña es requerida.',
      invalid_type_error: 'La contraseña debe ser una cadena de texto.',
    })
    .min(1, {
      message: 'La contraseña es requerida.',
    }),
});

export type LoginValues = z.infer<typeof loginSchema>;
