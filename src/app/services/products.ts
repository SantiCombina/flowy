import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import type { Brand, Category, Product, ProductVariant, Presentation, Quality } from '@/payload-types';

export interface PopulatedProductVariant extends Omit<ProductVariant, 'product' | 'presentation'> {
  product: Product & {
    brand?: Brand;
    category?: Category;
    quality?: Quality;
  };
  presentation: Presentation;
}

export interface CreateProductData {
  name: string;
  description?: string;
  brand?: number;
  category?: number;
  quality?: number;
  image?: number;
  isActive?: boolean;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  brand?: number | null;
  category?: number | null;
  quality?: number | null;
  image?: number | null;
  isActive?: boolean;
}

export interface ProductFilters {
  search?: string;
  brand?: number;
  category?: number;
  quality?: number;
  isActive?: boolean;
}

/**
 * Obtiene todos los productos de un owner con filtros opcionales
 */
export async function getProducts(
  ownerId: number,
  filters?: ProductFilters,
  options?: {
    limit?: number;
    page?: number;
    sort?: string;
  },
): Promise<{
  docs: Product[];
  totalDocs: number;
  totalPages: number;
  page: number;
}> {
  const payload = await getPayloadClient();

  const where: Where = {
    owner: { equals: ownerId },
  };

  if (filters?.search) {
    where.or = [
      { name: { contains: filters.search } },
      { code: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }

  if (filters?.brand !== undefined) {
    where.brand = { equals: filters.brand };
  }
  if (filters?.category !== undefined) {
    where.category = { equals: filters.category };
  }
  if (filters?.quality !== undefined) {
    where.quality = { equals: filters.quality };
  }
  if (filters?.isActive !== undefined) {
    where.isActive = { equals: filters.isActive };
  }

  const result = await payload.find({
    collection: 'products',
    where,
    limit: options?.limit || 10,
    page: options?.page || 1,
    sort: options?.sort || 'name',
    depth: 2, // Populate brand, category, quality, image
    overrideAccess: true,
  });

  return {
    docs: result.docs,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page!,
  };
}

/**
 * Obtiene un producto por ID
 */
export async function getProductById(id: number): Promise<Product | null> {
  const payload = await getPayloadClient();

  try {
    const product = await payload.findByID({
      collection: 'products',
      id,
      depth: 2, // Populate brand, category, quality, image
      overrideAccess: true,
    });
    return product;
  } catch {
    return null;
  }
}

/**
 * Crea un nuevo producto
 */
export async function createProduct(data: CreateProductData, ownerId: number): Promise<Product> {
  const payload = await getPayloadClient();

  const product = await payload.create({
    collection: 'products',
    data: {
      ...data,
      owner: ownerId,
    },
    overrideAccess: true,
  });

  return product;
}

/**
 * Actualiza un producto
 */
export async function updateProduct(id: number, data: UpdateProductData): Promise<Product> {
  const payload = await getPayloadClient();

  const product = await payload.update({
    collection: 'products',
    id,
    data,
    overrideAccess: true,
  });

  return product;
}

/**
 * Elimina un producto (y sus variantes asociadas)
 */
export async function deleteProduct(id: number): Promise<void> {
  const payload = await getPayloadClient();

  const variants = await payload.find({
    collection: 'product-variants',
    where: { product: { equals: id } },
    overrideAccess: true,
    limit: 1000,
  });

  for (const variant of variants.docs) {
    await payload.delete({
      collection: 'stock-movements',
      where: { variant: { equals: variant.id } },
      overrideAccess: true,
    });

    await payload.delete({
      collection: 'mobile-seller-inventory',
      where: { variant: { equals: variant.id } },
      overrideAccess: true,
    });

    await payload.delete({
      collection: 'product-variants',
      id: variant.id,
      overrideAccess: true,
    });
  }

  await payload.delete({
    collection: 'products',
    id,
    overrideAccess: true,
  });
}

export type CreateVariantData = Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt' | 'owner'>;

export interface UpdateVariantData {
  code?: string;
  presentation?: number;
  stock?: number;
  costPrice?: number;
  profitMargin?: number;
}

/**
 * Obtiene todas las variantes de un producto
 */
export async function getVariantsByProduct(productId: number): Promise<ProductVariant[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'product-variants',
    where: { product: { equals: productId } },
    sort: 'presentation',
    depth: 1, // Populate presentation
    overrideAccess: true,
  });

  return result.docs;
}

/**
 * Obtiene una variante por ID
 */
export async function getVariantById(id: number): Promise<ProductVariant | null> {
  const payload = await getPayloadClient();

  try {
    const variant = await payload.findByID({
      collection: 'product-variants',
      id,
      overrideAccess: true,
    });
    return variant;
  } catch {
    return null;
  }
}

/**
 * Crea una nueva variante
 */
export async function createVariant(data: CreateVariantData, ownerId: number): Promise<ProductVariant> {
  const payload = await getPayloadClient();

  const variant = await payload.create({
    collection: 'product-variants',
    data: { ...data, owner: ownerId },
    overrideAccess: true,
  });

  return variant;
}

/**
 * Actualiza una variante
 */
export async function updateVariant(id: number, data: UpdateVariantData): Promise<ProductVariant> {
  const payload = await getPayloadClient();

  const variant = await payload.update({
    collection: 'product-variants',
    id,
    data,
    overrideAccess: true,
  });

  return variant;
}

/**
 * Elimina una variante
 */
export async function deleteVariant(id: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({
    collection: 'product-variants',
    id,
    overrideAccess: true,
  });
}

/**
 * Obtiene todas las variantes de un owner (para listado con stock)
 */
export async function getAllVariants(
  ownerId: number,
  options?: {
    limit?: number;
    page?: number;
  },
): Promise<{
  docs: ProductVariant[];
  totalDocs: number;
  totalPages: number;
  page: number;
}> {
  const payload = await getPayloadClient();

  const where: Where = {
    owner: { equals: ownerId },
  };

  const result = await payload.find({
    collection: 'product-variants',
    where,
    limit: options?.limit || 10,
    page: options?.page || 1,
    sort: 'product',
    depth: 2, // Traer datos del producto y presentación
    overrideAccess: true,
  });

  const variants = result.docs;

  return {
    docs: variants,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page!,
  };
}

export interface VariantFilters {
  search?: string;
  brand?: number;
  category?: number;
  quality?: number;
  presentation?: number;
  isActive?: boolean;
}

/**
 * Obtiene todas las variantes con sus productos para el listado principal
 * Cada variante representa una fila en la tabla (Producto + Presentación)
 */
export async function getVariantsWithProducts(
  ownerId: number,
  filters?: VariantFilters,
  options?: {
    limit?: number;
    page?: number;
    sort?: string;
  },
): Promise<{
  docs: PopulatedProductVariant[];
  totalDocs: number;
  totalPages: number;
  page: number;
}> {
  const payload = await getPayloadClient();

  const where: Where = {
    owner: { equals: ownerId },
  };

  let productIds: number[] | undefined;
  if (filters?.brand || filters?.category || filters?.quality || filters?.isActive !== undefined || filters?.search) {
    const productWhere: Where = {
      owner: { equals: ownerId },
    };

    if (filters.brand) {
      productWhere.brand = { equals: filters.brand };
    }
    if (filters.category) {
      productWhere.category = { equals: filters.category };
    }
    if (filters.quality) {
      productWhere.quality = { equals: filters.quality };
    }
    if (filters.isActive !== undefined) {
      productWhere.isActive = { equals: filters.isActive };
    }
    if (filters.search) {
      productWhere.or = [
        { name: { contains: filters.search } },
        { code: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const productsResult = await payload.find({
      collection: 'products',
      where: productWhere,
      limit: 1000, // Alto límite para obtener todos los productos que cumplen
      overrideAccess: true,
    });

    productIds = productsResult.docs.map((p) => p.id);

    if (productIds.length === 0) {
      return {
        docs: [],
        totalDocs: 0,
        totalPages: 0,
        page: options?.page || 1,
      };
    }

    where.product = { in: productIds };
  }

  if (filters?.presentation) {
    where.presentation = { equals: filters.presentation };
  }

  const result = await payload.find({
    collection: 'product-variants',
    where,
    limit: options?.limit || 10,
    page: options?.page || 1,
    sort: options?.sort || 'product',
    depth: 2, // Traer datos completos del producto (con brand, category, quality) y presentación
    overrideAccess: true,
  });

  return {
    docs: result.docs as PopulatedProductVariant[],
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page!,
  };
}
