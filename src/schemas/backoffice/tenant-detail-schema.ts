import { z } from 'zod';

export const tenantDetailSchema = z.object({
  id: z
    .number({
      required_error: 'El identificador es obligatorio.',
      invalid_type_error: 'El identificador debe ser numérico.',
    })
    .int('El identificador debe ser entero.')
    .positive('El identificador debe ser positivo.'),
});

export type TenantDetailValues = z.infer<typeof tenantDetailSchema>;
