import { z } from 'zod';

import { CAPABILITIES } from '@/lib/entitlements/capabilities';

const positiveId = z.coerce
  .number({
    required_error: 'El identificador es obligatorio',
    invalid_type_error: 'El identificador debe ser numérico',
  })
  .int('El identificador debe ser entero')
  .positive('El identificador debe ser positivo');

const quota = z.coerce
  .number({
    required_error: 'La cuota es obligatoria',
    invalid_type_error: 'La cuota debe ser numérica',
  })
  .int('La cuota debe ser entera')
  .min(0, 'La cuota no puede ser negativa');

export const publishAdminPlanSchema = z.object({
  planCode: z.enum(['basic', 'medium', 'professional'], {
    required_error: 'El plan es obligatorio',
    invalid_type_error: 'El plan no es válido',
  }),
  capabilities: z
    .array(
      z.enum(CAPABILITIES, {
        required_error: 'La capacidad es obligatoria',
        invalid_type_error: 'La capacidad no es válida',
      }),
    )
    .min(1, 'Seleccioná al menos una capacidad'),
  quotas: z.object({
    maxSellerSeats: quota,
    maxProducts: quota,
    maxVariantsPerProduct: quota,
    maxVariantsPerTenant: quota,
  }),
});

export const changeTenantPlanSchema = z.object({
  tenantId: positiveId,
  planVersionId: positiveId,
});
