import { z } from 'zod';

export const assignPlanSchema = z.object({
  tenantId: z.number({
    required_error: 'El ID del tenant es requerido.',
    invalid_type_error: 'El ID del tenant debe ser un número.',
  }),
  planVersionId: z.number({
    required_error: 'El ID de la versión de plan es requerido.',
    invalid_type_error: 'El ID de la versión de plan debe ser un número.',
  }),
});

export type AssignPlanValues = z.infer<typeof assignPlanSchema>;
