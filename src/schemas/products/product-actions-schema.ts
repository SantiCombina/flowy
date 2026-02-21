import { z } from 'zod';

export const productFiltersSchema = z.object({
  search: z
    .string({
      invalid_type_error: 'La búsqueda debe ser una cadena de texto.',
    })
    .optional(),
  brand: z
    .number({
      invalid_type_error: 'La marca debe ser un número.',
    })
    .optional(),
  category: z
    .number({
      invalid_type_error: 'La categoría debe ser un número.',
    })
    .optional(),
  quality: z
    .number({
      invalid_type_error: 'La calidad debe ser un número.',
    })
    .optional(),
  isActive: z
    .boolean({
      invalid_type_error: 'El estado debe ser un valor booleano.',
    })
    .optional(),
});

export type ProductFiltersValues = z.infer<typeof productFiltersSchema>;

export const variantFiltersSchema = z.object({
  search: z
    .string({
      invalid_type_error: 'La búsqueda debe ser una cadena de texto.',
    })
    .optional(),
  brand: z
    .number({
      invalid_type_error: 'La marca debe ser un número.',
    })
    .optional(),
  category: z
    .number({
      invalid_type_error: 'La categoría debe ser un número.',
    })
    .optional(),
  quality: z
    .number({
      invalid_type_error: 'La calidad debe ser un número.',
    })
    .optional(),
  presentation: z
    .number({
      invalid_type_error: 'La presentación debe ser un número.',
    })
    .optional(),
  isActive: z
    .boolean({
      invalid_type_error: 'El estado debe ser un valor booleano.',
    })
    .optional(),
});

export type VariantFiltersValues = z.infer<typeof variantFiltersSchema>;

export const paginationSchema = z.object({
  limit: z
    .number({
      required_error: 'El límite es requerido.',
      invalid_type_error: 'El límite debe ser un número.',
    })
    .min(1, {
      message: 'El límite debe ser al menos 1.',
    })
    .max(10000, {
      message: 'El límite no puede ser mayor a 10000.',
    })
    .default(10),
  page: z
    .number({
      required_error: 'La página es requerida.',
      invalid_type_error: 'La página debe ser un número.',
    })
    .min(1, {
      message: 'La página debe ser al menos 1.',
    })
    .default(1),
  sort: z
    .string({
      invalid_type_error: 'El ordenamiento debe ser una cadena de texto.',
    })
    .default('name'),
});

export type PaginationValues = z.infer<typeof paginationSchema>;

export const createProductActionSchema = z.object({
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
  brand: z
    .number({
      invalid_type_error: 'La marca debe ser un número.',
    })
    .optional(),
  category: z
    .number({
      invalid_type_error: 'La categoría debe ser un número.',
    })
    .optional(),
  quality: z
    .number({
      invalid_type_error: 'La calidad debe ser un número.',
    })
    .optional(),
  image: z
    .number({
      invalid_type_error: 'La imagen debe ser un número.',
    })
    .optional(),
  isActive: z
    .boolean({
      invalid_type_error: 'El estado debe ser un valor booleano.',
    })
    .optional(),
});

export type CreateProductActionValues = z.infer<typeof createProductActionSchema>;

export const updateProductActionSchema = z.object({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
  name: z
    .string({
      invalid_type_error: 'El nombre debe ser una cadena de texto.',
    })
    .trim()
    .min(1, {
      message: 'El nombre es requerido.',
    })
    .max(200, {
      message: 'El nombre debe tener como máximo 200 caracteres.',
    })
    .optional(),
  description: z
    .string({
      invalid_type_error: 'La descripción debe ser una cadena de texto.',
    })
    .optional(),
  brand: z
    .number({
      invalid_type_error: 'La marca debe ser un número.',
    })
    .optional(),
  category: z
    .number({
      invalid_type_error: 'La categoría debe ser un número.',
    })
    .optional(),
  quality: z
    .number({
      invalid_type_error: 'La calidad debe ser un número.',
    })
    .optional(),
  image: z
    .number({
      invalid_type_error: 'La imagen debe ser un número.',
    })
    .optional(),
  isActive: z
    .boolean({
      invalid_type_error: 'El estado debe ser un valor booleano.',
    })
    .optional(),
});

export type UpdateProductActionValues = z.infer<typeof updateProductActionSchema>;

export const createVariantActionSchema = z.object({
  code: z
    .string({
      invalid_type_error: 'El código debe ser una cadena de texto.',
    })
    .optional(),
  product: z.number({
    required_error: 'El producto es requerido.',
    invalid_type_error: 'El producto debe ser un número.',
  }),
  presentation: z
    .number({
      invalid_type_error: 'La presentación debe ser un número.',
    })
    .optional(),
  stock: z
    .number({
      invalid_type_error: 'El stock debe ser un número.',
    })
    .min(0, {
      message: 'El stock no puede ser negativo.',
    })
    .default(0),
  minStock: z
    .number({
      invalid_type_error: 'El stock mínimo debe ser un número.',
    })
    .min(0, {
      message: 'El stock mínimo no puede ser negativo.',
    })
    .default(0),
  price: z
    .number({
      required_error: 'El precio es requerido.',
      invalid_type_error: 'El precio debe ser un número.',
    })
    .min(0, {
      message: 'El precio debe ser positivo.',
    }),
});

export type CreateVariantActionValues = z.infer<typeof createVariantActionSchema>;

export const updateVariantActionSchema = z.object({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
  code: z
    .string({
      invalid_type_error: 'El código debe ser una cadena de texto.',
    })
    .optional(),
  presentation: z
    .number({
      invalid_type_error: 'La presentación debe ser un número.',
    })
    .optional(),
  stock: z
    .number({
      invalid_type_error: 'El stock debe ser un número.',
    })
    .min(0, {
      message: 'El stock no puede ser negativo.',
    })
    .optional(),
  minStock: z
    .number({
      invalid_type_error: 'El stock mínimo debe ser un número.',
    })
    .min(0, {
      message: 'El stock mínimo no puede ser negativo.',
    })
    .optional(),
  price: z
    .number({
      invalid_type_error: 'El precio debe ser un número.',
    })
    .min(0, {
      message: 'El precio debe ser positivo.',
    })
    .optional(),
});

export type UpdateVariantActionValues = z.infer<typeof updateVariantActionSchema>;

export const deleteProductActionSchema = z.object({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
});

export type DeleteProductActionValues = z.infer<typeof deleteProductActionSchema>;

export const deleteVariantActionSchema = z.object({
  id: z.number({
    required_error: 'El ID es requerido.',
    invalid_type_error: 'El ID debe ser un número.',
  }),
});

export type DeleteVariantActionValues = z.infer<typeof deleteVariantActionSchema>;

export const createEntitySchema = z.object({
  type: z.enum(['brand', 'category', 'quality', 'presentation'], {
    required_error: 'El tipo de entidad es requerido.',
    invalid_type_error: 'El tipo de entidad debe ser brand, category, quality o presentation.',
  }),
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
});

export type CreateEntityValues = z.infer<typeof createEntitySchema>;
