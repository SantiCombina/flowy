import { z } from 'zod';

import { tenantDetailSchema } from '@/schemas/backoffice/tenant-detail-schema';

export const reactivateTenantSchema = tenantDetailSchema.extend({
  recoveryConfirmed: z.boolean({
    required_error: 'La confirmación de recuperación es obligatoria.',
    invalid_type_error: 'La confirmación de recuperación no es válida.',
  }),
});

export const changeTenantPlanSchema = tenantDetailSchema.extend({
  planVersionId: z
    .number({ required_error: 'El plan es obligatorio.', invalid_type_error: 'El plan debe ser numérico.' })
    .int('El plan debe ser entero.')
    .positive('El plan no es válido.'),
});

export const tenantControlDateSchema = tenantDetailSchema.extend({
  planControlDate: z
    .string({ required_error: 'La fecha es obligatoria.', invalid_type_error: 'La fecha debe ser un texto.' })
    .trim()
    .max(10, 'La fecha no es válida.')
    .refine((value) => {
      if (value === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T12:00:00.000Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, 'La fecha no es válida.'),
});

export type ChangeTenantPlanValues = z.infer<typeof changeTenantPlanSchema>;
export type TenantControlDateValues = z.infer<typeof tenantControlDateSchema>;
export type ReactivateTenantValues = z.infer<typeof reactivateTenantSchema>;
