import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({
        required_error: 'El nombre es requerido.',
        invalid_type_error: 'El nombre debe ser una cadena de texto.',
      })
      .trim()
      .min(2, {
        message: 'El nombre debe tener al menos 2 caracteres.',
      })
      .max(100, {
        message: 'El nombre debe tener como máximo 100 caracteres.',
      }),
    password: z
      .string({
        required_error: 'La contraseña es requerida.',
        invalid_type_error: 'La contraseña debe ser una cadena de texto.',
      })
      .min(8, {
        message: 'La contraseña debe tener al menos 8 caracteres.',
      })
      .max(100, {
        message: 'La contraseña debe tener como máximo 100 caracteres.',
      })
      .refine((val) => !val.includes(' '), {
        message: 'La contraseña no puede contener espacios.',
      }),
    confirmPassword: z.string({
      required_error: 'Confirma tu contraseña.',
      invalid_type_error: 'La confirmación debe ser una cadena de texto.',
    }),
    email: z
      .string({
        required_error: 'El email es requerido.',
        invalid_type_error: 'El email debe ser una cadena de texto.',
      })
      .email({
        message: 'Proporciona un email válido.',
      }),
    token: z.string({
      required_error: 'El token es requerido.',
      invalid_type_error: 'El token debe ser una cadena de texto.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
