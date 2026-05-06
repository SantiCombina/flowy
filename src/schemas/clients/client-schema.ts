import { z } from 'zod';

import { phoneSchema } from '@/lib/phone';

export const clientSchema = z.object({
  name: z
    .string({ required_error: 'El nombre es requerido', invalid_type_error: 'El nombre debe ser texto' })
    .trim()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede superar los 200 caracteres'),
  cuit: z
    .string({ invalid_type_error: 'El CUIT debe ser texto' })
    .trim()
    .max(13, 'El CUIT no puede superar los 13 caracteres')
    .refine((val) => !val || /^\d{2}-\d{8}-\d$/.test(val), 'El formato debe ser XX-XXXXXXXX-X')
    .optional()
    .or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  email: z
    .string({ invalid_type_error: 'El email debe ser texto' })
    .trim()
    .max(200, 'El email no puede superar los 200 caracteres')
    .email('El email no es válido')
    .optional()
    .or(z.literal('')),
  address: z
    .string({ invalid_type_error: 'La dirección debe ser texto' })
    .trim()
    .max(500, 'La dirección no puede superar los 500 caracteres')
    .optional()
    .or(z.literal('')),
  provincia: z
    .string({ invalid_type_error: 'La provincia debe ser texto' })
    .trim()
    .max(100, 'La provincia no puede superar los 100 caracteres')
    .optional()
    .or(z.literal('')),
  localidad: z
    .string({ invalid_type_error: 'La localidad debe ser texto' })
    .trim()
    .max(100, 'La localidad no puede superar los 100 caracteres')
    .optional()
    .or(z.literal('')),
  zone: z.number({ invalid_type_error: 'La zona debe ser un número' }).nullable().optional(),
});

export type ClientValues = z.infer<typeof clientSchema>;

export const updateClientSchema = clientSchema.extend({
  id: z.number({ required_error: 'El id es requerido', invalid_type_error: 'El id debe ser un número' }),
});

export type UpdateClientValues = z.infer<typeof updateClientSchema>;

export const deleteClientSchema = z.object({
  id: z.number({ required_error: 'El id es requerido', invalid_type_error: 'El id debe ser un número' }),
});

export type DeleteClientValues = z.infer<typeof deleteClientSchema>;
