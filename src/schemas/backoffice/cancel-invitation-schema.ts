import { z } from 'zod';

export const cancelInvitationSchema = z.object({
  id: z
    .number({ required_error: 'La invitación es requerida', invalid_type_error: 'La invitación no es válida' })
    .int()
    .positive(),
});

export type CancelInvitationValues = z.infer<typeof cancelInvitationSchema>;
