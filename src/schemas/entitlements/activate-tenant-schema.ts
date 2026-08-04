import { z } from 'zod';

const rolloutIdentifier = z
  .string({
    required_error: 'El identificador es obligatorio',
    invalid_type_error: 'El identificador debe ser texto',
  })
  .trim()
  .min(1, 'El identificador es obligatorio')
  .max(100, 'El identificador no puede superar los 100 caracteres')
  .regex(/^[a-zA-Z0-9._:-]+$/, 'El identificador contiene caracteres no permitidos');

export const activateTenantSchema = z.object({
  tenantId: z
    .number({
      required_error: 'El tenant es obligatorio',
      invalid_type_error: 'El tenant debe ser un nÃºmero',
    })
    .int('El tenant debe ser un nÃºmero entero')
    .positive('El tenant debe ser positivo'),
  runId: rolloutIdentifier,
  evidenceId: rolloutIdentifier,
});

export type ActivateTenantValues = z.infer<typeof activateTenantSchema>;
