import { z } from 'zod';

export const variantSchema = z.object({
  id: z
    .number({
      invalid_type_error: 'El ID debe ser un número.',
    })
    .optional(),
  presentationId: z
    .string({
      invalid_type_error: 'La presentación debe ser una cadena de texto.',
    })
    .optional(),
  code: z
    .string({
      invalid_type_error: 'El código debe ser una cadena de texto.',
    })
    .optional(),
  stock: z
    .number({
      required_error: 'El stock es requerido.',
      invalid_type_error: 'El stock debe ser un número.',
    })
    .min(0, {
      message: 'El stock no puede ser negativo.',
    }),
  minimumStock: z
    .number({
      required_error: 'El stock mínimo es requerido.',
      invalid_type_error: 'El stock mínimo debe ser un número.',
    })
    .min(0, {
      message: 'El stock mínimo no puede ser negativo.',
    }),
  costPrice: z
    .number({
      required_error: 'El precio de costo es requerido.',
      invalid_type_error: 'El precio de costo debe ser un número.',
    })
    .min(0, {
      message: 'El precio de costo no puede ser negativo.',
    }),
  profitMargin: z
    .number({
      required_error: 'El margen de ganancia es requerido.',
      invalid_type_error: 'El margen debe ser un número.',
    })
    .min(0, {
      message: 'El margen no puede ser negativo.',
    }),
});

export const productSchema = z.object({
  name: z
    .string({
      required_error: 'El nombre es requerido.',
      invalid_type_error: 'El nombre debe ser una cadena de texto.',
    })
    .trim()
    .min(1, {
      message: 'El nombre es requerido.',
    })
    .max(200, {
      message: 'El nombre debe tener como máximo 200 caracteres.',
    }),
  description: z
    .string({
      invalid_type_error: 'La descripción debe ser una cadena de texto.',
    })
    .optional(),
  brandId: z
    .string({
      invalid_type_error: 'La marca debe ser una cadena de texto.',
    })
    .optional(),
  categoryId: z
    .string({
      invalid_type_error: 'La categoría debe ser una cadena de texto.',
    })
    .optional(),
  qualityId: z
    .string({
      invalid_type_error: 'La calidad debe ser una cadena de texto.',
    })
    .optional(),
  isActive: z.boolean({
    required_error: 'El estado es requerido.',
    invalid_type_error: 'El estado debe ser un valor booleano.',
  }),
  variants: z
    .array(variantSchema, {
      required_error: 'Las variantes son requeridas.',
      invalid_type_error: 'Las variantes deben ser un array.',
    })
    .min(1, {
      message: 'Debe agregar al menos una presentación.',
    }),
});

export type ProductFormData = z.infer<typeof productSchema>;
export type VariantFormData = z.infer<typeof variantSchema>;
