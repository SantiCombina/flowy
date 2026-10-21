import { z } from 'zod';

export const invitationStateSchema = z.enum(['all', 'pending', 'accepted', 'expired', 'cancelled', 'replaced'], {
  required_error: 'El estado es requerido',
  invalid_type_error: 'El estado no es válido',
});

export const invitationListSchema = z.object({
  search: z
    .string({ required_error: 'La búsqueda es requerida', invalid_type_error: 'La búsqueda debe ser texto' })
    .trim()
    .max(200, 'Máximo 200 caracteres')
    .catch(''),
  state: invitationStateSchema.catch('all'),
  page: z.coerce
    .number({ required_error: 'La página es requerida', invalid_type_error: 'La página no es válida' })
    .int()
    .min(1)
    .max(1000000)
    .catch(1),
});

export type InvitationListValues = z.infer<typeof invitationListSchema>;
