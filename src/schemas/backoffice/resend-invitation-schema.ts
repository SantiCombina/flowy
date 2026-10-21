import { z } from 'zod';

export const resendInvitationSchema = z.object({
  id: z.number({ required_error: 'La invitación es requerida', invalid_type_error: 'La invitación no es válida' })
    .int().positive(),
});

export type ResendInvitationValues = z.infer<typeof resendInvitationSchema>;
