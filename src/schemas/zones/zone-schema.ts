import { z } from 'zod';

export const createZoneSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido', invalid_type_error: 'El nombre debe ser texto' })
    .trim()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
});

export const updateZoneSchema = createZoneSchema.extend({
  id: z.number({ required_error: 'El id es requerido', invalid_type_error: 'El id debe ser un número' }),
});

export const deleteZoneSchema = z.object({
  id: z.number({ required_error: 'El id es requerido', invalid_type_error: 'El id debe ser un número' }),
});

export type CreateZoneValues = z.infer<typeof createZoneSchema>;
export type UpdateZoneValues = z.infer<typeof updateZoneSchema>;
export type DeleteZoneValues = z.infer<typeof deleteZoneSchema>;
