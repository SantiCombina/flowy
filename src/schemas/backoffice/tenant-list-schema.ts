import { z } from 'zod';

export const tenantListSchema = z.object({
  search: z
    .string({ invalid_type_error: 'La búsqueda debe ser una cadena de texto.' })
    .trim()
    .max(120, 'La búsqueda no puede superar los 120 caracteres.')
    .optional(),
  planCode: z
    .enum(['basic', 'medium', 'professional'], { invalid_type_error: 'El código de plan no es válido.' })
    .optional(),
  state: z
    .enum(['provisioning', 'active', 'blocked'], { invalid_type_error: 'El estado de entitlement no es válido.' })
    .optional(),
  page: z
    .number({
      required_error: 'La página es obligatoria.',
      invalid_type_error: 'La página debe ser un número.',
    })
    .int('La página debe ser un número entero.')
    .min(1, 'La página debe ser mayor o igual a 1.')
    .default(1),
  limit: z
    .number({
      required_error: 'El límite es obligatorio.',
      invalid_type_error: 'El límite debe ser un número.',
    })
    .int('El límite debe ser un número entero.')
    .min(1, 'El límite debe ser mayor o igual a 1.')
    .max(100, 'El límite no puede superar los 100.')
    .default(20),
});

export type TenantListValues = z.infer<typeof tenantListSchema>;
