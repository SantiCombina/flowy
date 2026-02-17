import { z } from 'zod';

export const editSellerSchema = z.object({
  name: z
    .string({
      required_error: 'El nombre es requerido.',
      invalid_type_error: 'El nombre debe ser una cadena de texto.',
    })
    .trim()
    .min(1, {
      message: 'El nombre es requerido.',
    })
    .max(100, {
      message: 'El nombre debe tener como máximo 100 caracteres.',
    }),
  email: z
    .string({
      required_error: 'El email es requerido.',
      invalid_type_error: 'El email debe ser una cadena de texto.',
    })
    .trim()
    .email({
      message: 'Por favor ingresa una dirección de email válida.',
    }),
  phone: z
    .string({
      invalid_type_error: 'El teléfono debe ser una cadena de texto.',
    })
    .max(20, {
      message: 'El teléfono debe tener como máximo 20 caracteres.',
    })
    .optional()
    .or(z.literal('')),
  dni: z
    .string({
      invalid_type_error: 'El DNI debe ser una cadena de texto.',
    })
    .regex(/^\d{7,8}$/, {
      message: 'El DNI debe tener 7 u 8 dígitos.',
    })
    .optional()
    .or(z.literal('')),
  cuitCuil: z
    .string({
      invalid_type_error: 'El CUIT/CUIL debe ser una cadena de texto.',
    })
    .regex(/^\d{2}-\d{8}-\d{1}$/, {
      message: 'Formato inválido. Usar XX-XXXXXXXX-X.',
    })
    .optional()
    .or(z.literal('')),
  cbu: z
    .string({
      invalid_type_error: 'El CBU/Alias debe ser una cadena de texto.',
    })
    .max(50, {
      message: 'Máximo 50 caracteres.',
    })
    .optional()
    .or(z.literal('')),
  isActive: z.boolean({
    required_error: 'El estado es requerido.',
    invalid_type_error: 'El estado debe ser un valor booleano.',
  }),
});

export type EditSellerValues = z.infer<typeof editSellerSchema>;

export const updateSellerActionSchema = editSellerSchema.extend({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
});

export type UpdateSellerActionValues = z.infer<typeof updateSellerActionSchema>;

export const deleteSellerActionSchema = z.object({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
});

export type DeleteSellerActionValues = z.infer<typeof deleteSellerActionSchema>;
