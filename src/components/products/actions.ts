'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getVariantsByProduct,
  getVariantsWithProducts,
  createVariant,
  updateVariant,
  deleteVariant,
  type CreateProductData,
  type UpdateProductData,
  type CreateVariantData,
  type UpdateVariantData,
  type VariantFilters,
} from '@/app/services/products';
import { getProductDemandSummary, getVariantSalesHistory } from '@/app/services/sales';
import { getCurrentUser } from '@/lib/payload';
import { resolveId } from '@/lib/payload-utils';
import { actionClient } from '@/lib/safe-action';
import { bulkUpdatePricesSchema, bulkToggleActiveSchema } from '@/schemas/products/bulk-actions-schema';
import {
  productFiltersSchema,
  variantFiltersSchema,
  paginationSchema,
  createProductActionSchema,
  updateProductActionSchema,
  createVariantActionSchema,
  updateVariantActionSchema,
  deleteProductActionSchema,
  deleteVariantActionSchema,
  createEntitySchema,
} from '@/schemas/products/product-actions-schema';

export const getProductsAction = actionClient
  .schema(
    z.object({
      filters: productFiltersSchema.optional(),
      options: paginationSchema.optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const ownerId = user.id;

    const result = await getProducts(ownerId, parsedInput.filters, parsedInput.options);

    return {
      success: true,
      ...result,
    };
  });

export const getVariantsAction = actionClient
  .schema(
    z.object({
      filters: variantFiltersSchema.optional(),
      options: paginationSchema.optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    let ownerId: number;
    if (user.role === 'admin' || user.role === 'owner') {
      ownerId = user.id;
    } else if (user.role === 'seller') {
      const resolved = resolveId(user.owner);
      if (!resolved) throw new Error('El vendedor no tiene un dueño asignado');
      ownerId = resolved;
    } else {
      throw new Error('No autorizado');
    }

    const filters: VariantFilters = {
      search: parsedInput.filters?.search,
      brand: parsedInput.filters?.brand,
      category: parsedInput.filters?.category,
      quality: parsedInput.filters?.quality,
      presentation: parsedInput.filters?.presentation,
      isActive: parsedInput.filters?.isActive,
    };
    const result = await getVariantsWithProducts(ownerId, filters, parsedInput.options);

    return {
      success: true,
      ...result,
    };
  });

export const getProductByIdAction = actionClient
  .schema(z.object({ id: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    const product = await getProductById(parsedInput.id);

    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const ownerId =
      user.role === 'admin' ? resolveId(product.owner) : user.role === 'owner' ? user.id : resolveId(user.owner);
    if (typeof product.owner === 'number' && product.owner !== ownerId) {
      throw new Error('No autorizado');
    }

    const variants = await getVariantsByProduct(parsedInput.id);

    return {
      success: true,
      product,
      variants,
    };
  });

export const getVariantsByProductIdAction = actionClient
  .schema(z.object({ productId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    const variants = await getVariantsByProduct(parsedInput.productId);

    return {
      success: true,
      variants,
    };
  });

export const createProductAction = actionClient.schema(createProductActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const productData: CreateProductData = {
    name: parsedInput.name,
    description: parsedInput.description,
    brand: parsedInput.brand,
    category: parsedInput.category,
    quality: parsedInput.quality,
    image: parsedInput.image,
    isActive: parsedInput.isActive,
  };
  const product = await createProduct(productData, user.id);

  revalidatePath('/products');

  return {
    success: true,
    product,
  };
});

export const updateProductAction = actionClient.schema(updateProductActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const productData: UpdateProductData = {
    name: data.name,
    description: data.description,
    brand: data.brand ?? null,
    category: data.category ?? null,
    quality: data.quality ?? null,
    image: data.image ?? null,
    isActive: data.isActive,
  };
  const product = await updateProduct(id, productData);

  revalidatePath('/products');

  return {
    success: true,
    product,
  };
});

export const deleteProductAction = actionClient.schema(deleteProductActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await deleteProduct(parsedInput.id);

  revalidatePath('/products');

  return {
    success: true,
  };
});

export const createEntityAction = actionClient.schema(createEntitySchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const { createBrand, createCategory, createQuality, createPresentation } = await import('@/app/services/entities');
  const ownerId = user.id;

  type EntityResult = { id: number; name: string };
  let result: EntityResult;

  switch (parsedInput.type) {
    case 'brand': {
      const brand = await createBrand(parsedInput.name, ownerId);
      result = { id: brand.id, name: brand.name };
      break;
    }
    case 'category': {
      const category = await createCategory(parsedInput.name, ownerId);
      result = { id: category.id, name: category.name };
      break;
    }
    case 'quality': {
      const quality = await createQuality(parsedInput.name, ownerId);
      result = { id: quality.id, name: quality.name };
      break;
    }
    case 'presentation': {
      const match = parsedInput.name.match(/^(\d+\.?\d*)\s*(\w+)$/);
      const amount = match ? parseFloat(match[1]) : 1;
      const unit = match ? match[2] : 'unidad';
      const presentation = await createPresentation(parsedInput.name, ownerId, { amount, unit });
      result = { id: presentation.id, name: presentation.label };
      break;
    }
  }

  return {
    success: true,
    entity: result,
  };
});

export const getReferenceDataAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No autenticado');
  }

  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new Error('Solo los due\u00f1os pueden crear productos');
  }

  const { getBrands, getCategories, getQualities, getPresentations } = await import('@/app/services/entities');
  const ownerId = user.id;

  const [brands, categories, qualities, presentations] = await Promise.all([
    getBrands(ownerId),
    getCategories(ownerId),
    getQualities(ownerId),
    getPresentations(ownerId),
  ]);

  return {
    success: true,
    brands,
    categories,
    qualities,
    presentations,
  };
});

export const getProductDemandSummaryAction = actionClient.action(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== 'owner') throw new Error('No autorizado');
  const demand = await getProductDemandSummary(user.id);
  return { success: true, demand };
});

export const getVariantSalesHistoryAction = actionClient
  .schema(z.object({ variantId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') throw new Error('No autorizado');
    const history = await getVariantSalesHistory(parsedInput.variantId, user.id);
    return { success: true, history };
  });

export const getProductVariantsAction = actionClient
  .schema(z.object({ productId: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('No autenticado');
    }

    const variants = await getVariantsByProduct(parsedInput.productId);

    return {
      success: true,
      variants,
    };
  });

export const createVariantAction = actionClient.schema(createVariantActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const variantData: CreateVariantData = {
    code: parsedInput.code ?? '',
    product: parsedInput.product,
    presentation: parsedInput.presentation,
    stock: parsedInput.stock,
    minimumStock: parsedInput.minimumStock,
    costPrice: parsedInput.costPrice,
    profitMargin: parsedInput.profitMargin,
  };
  const variant = await createVariant(variantData, user.id);

  revalidatePath('/products');

  return {
    success: true,
    variant,
  };
});

export const updateVariantAction = actionClient.schema(updateVariantActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const variantData: UpdateVariantData = {
    code: data.code,
    presentation: data.presentation,
    stock: data.stock,
    minimumStock: data.minimumStock,
    costPrice: data.costPrice,
    profitMargin: data.profitMargin,
  };
  const variant = await updateVariant(id, variantData);

  revalidatePath('/products');

  return {
    success: true,
    variant,
  };
});

export const deleteVariantAction = actionClient.schema(deleteVariantActionSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await deleteVariant(parsedInput.id);

  revalidatePath('/products');

  return {
    success: true,
  };
});

export const bulkUpdateVariantPricesAction = actionClient
  .schema(bulkUpdatePricesSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    await Promise.all(parsedInput.updates.map(({ variantId, costPrice }) => updateVariant(variantId, { costPrice })));

    revalidatePath('/products');

    return {
      success: true,
      updated: parsedInput.updates.length,
    };
  });

export const bulkToggleProductsAction = actionClient.schema(bulkToggleActiveSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await Promise.all(parsedInput.productIds.map((id) => updateProduct(id, { isActive: parsedInput.isActive })));

  revalidatePath('/products');

  return {
    success: true,
    updated: parsedInput.productIds.length,
  };
});
