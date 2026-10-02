import { z } from 'zod';

export const adminInvitationSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'El nombre debe ser texto',
    })
    .trim()
    .max(120, { message: 'Máximo 120 caracteres.' })
    .optional(),
  email: z
    .string({
      required_error: 'El email es requerido',
      invalid_type_error: 'El email debe ser una cadena de texto',
    })
    .trim()
    .email({ message: 'Ingresá un email válido.' }),
  businessName: z
    .string({
      invalid_type_error: 'El nombre del negocio debe ser texto',
    })
    .trim()
    .max(120, { message: 'Máximo 120 caracteres.' })
    .optional(),
});

export type AdminInvitationValues = z.infer<typeof adminInvitationSchema>;
