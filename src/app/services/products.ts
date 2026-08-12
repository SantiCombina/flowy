import { revalidateTag, unstable_cache } from 'next/cache';
import type { Where } from 'payload';

import { cacheTags } from '@/lib/cache-tags';
import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import { countProducts, snapshotQuotas, type CountContext, type CountDependencies } from '@/lib/entitlements/quotas';
import { resolveId } from '@/lib/payload-utils';
import type {
  Brand,
  Category,
  Product,
  ProductVariant,
  Presentation,
  Quality,
  TenantEntitlementSnapshot,
  User,
} from '@/payload-types';

export { createVariantWithQuota } from './variants';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export interface PopulatedProductVariant extends Omit<ProductVariant, 'product' | 'presentation'> {
  product: Product & {
    brand?: Brand;
    category?: Category;
    quality?: Quality;
  };
  presentation: Presentation | null;
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
    depth: 2,
    overrideAccess: true,
  });

  return {
    docs: result.docs,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page!,
  };
}

export async function getProductById(id: number): Promise<Product | null> {
  const payload = await getPayloadClient();

  try {
    const product = await payload.findByID({
      collection: 'products',
      id,
      depth: 2,
      overrideAccess: true,
    });
    return product;
  } catch {
    return null;
  }
}

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

  try {
    revalidateTag(cacheTags.products(ownerId));
    revalidateTag(cacheTags.saleOptions(ownerId));
  } catch {}
  return product;
}

export async function updateProduct(id: number, data: UpdateProductData, ownerId: number): Promise<Product> {
  const payload = await getPayloadClient();

  const existing = await payload.findByID({
    collection: 'products',
    id,
    depth: 0,
    overrideAccess: true,
  });
  if (!existing || resolveId(existing.owner) !== ownerId) {
    throw new Error('Producto no encontrado');
  }

  const product = await payload.update({
    collection: 'products',
    id,
    data,
    overrideAccess: true,
  });

  const productOwnerId = resolveId(product.owner) ?? 0;
  try {
    revalidateTag(cacheTags.products(productOwnerId));
    revalidateTag(cacheTags.saleOptions(productOwnerId));
  } catch {}
  return product;
}

export async function deleteProduct(id: number, ownerId: number): Promise<void> {
  const payload = await getPayloadClient();

  const existingProduct = await payload.findByID({
    collection: 'products',
    id,
    depth: 0,
    overrideAccess: true,
  });

  if (resolveId(existingProduct.owner) !== ownerId) {
    throw new Error('Producto no encontrado');
  }

  const variants = await payload.find({
    collection: 'product-variants',
    where: { product: { equals: id } },
    overrideAccess: true,
    limit: 1000,
    depth: 0,
  });

  if (variants.docs.length > 0) {
    const variantIds = variants.docs.map((v) => v.id);

    const { totalDocs } = await payload.find({
      collection: 'sales',
      where: { 'items.variant': { in: variantIds } },
      limit: 1,
      overrideAccess: true,
    });

    if (totalDocs > 0) {
      throw new Error('No se puede eliminar el producto porque tiene ventas asociadas.');
    }

    await Promise.all(
      variants.docs.map((variant) =>
        Promise.all([
          payload.delete({
            collection: 'stock-movements',
            where: { variant: { equals: variant.id } },
            overrideAccess: true,
          }),
          payload.delete({
            collection: 'mobile-seller-inventory',
            where: { variant: { equals: variant.id } },
            overrideAccess: true,
          }),
          payload.delete({
            collection: 'product-variants',
            id: variant.id,
            overrideAccess: true,
          }),
        ]),
      ),
    );
  }

  await payload.delete({
    collection: 'products',
    id,
    overrideAccess: true,
  });

  const productOwnerId = resolveId(existingProduct.owner) ?? 0;
  try {
    revalidateTag(cacheTags.products(productOwnerId));
    revalidateTag(cacheTags.saleOptions(productOwnerId));
    revalidateTag(cacheTags.history(productOwnerId));
  } catch {}
}

export type CreateVariantData = Omit<ProductVariant, 'id' | 'createdAt' | 'updatedAt' | 'owner'>;

export interface UpdateVariantData {
  code?: string;
  presentation?: number;
  stock?: number;
  minimumStock?: number;
  costPrice?: number;
  profitMargin?: number;
}

export async function getVariantsByProduct(productId: number, ownerId: number): Promise<ProductVariant[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'product-variants',
    where: {
      and: [{ product: { equals: productId } }, { owner: { equals: ownerId } }],
    },
    sort: 'presentation',
    depth: 1,
    overrideAccess: true,
  });

  return result.docs;
}

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

export async function createVariant(data: CreateVariantData, ownerId: number): Promise<ProductVariant> {
  const payload = await getPayloadClient();

  const variant = await payload.create({
    collection: 'product-variants',
    data: { ...data, owner: ownerId },
    overrideAccess: true,
  });

  try {
    revalidateTag(cacheTags.products(ownerId));
    revalidateTag(cacheTags.saleOptions(ownerId));
  } catch {}
  return variant;
}

export async function updateVariant(id: number, data: UpdateVariantData, ownerId: number): Promise<ProductVariant> {
  const payload = await getPayloadClient();

  const existing = await payload.findByID({
    collection: 'product-variants',
    id,
    depth: 0,
    overrideAccess: true,
  });
  if (!existing || resolveId(existing.owner) !== ownerId) {
    throw new Error('Variante no encontrada');
  }

  const variant = await payload.update({
    collection: 'product-variants',
    id,
    data,
    overrideAccess: true,
  });

  const variantOwnerId = resolveId(variant.owner) ?? 0;
  try {
    revalidateTag(cacheTags.products(variantOwnerId));
    revalidateTag(cacheTags.saleOptions(variantOwnerId));
  } catch {}
  return variant;
}

export async function deleteVariant(id: number, ownerId: number): Promise<void> {
  const payload = await getPayloadClient();

  const existingVariant = await payload.findByID({
    collection: 'product-variants',
    id,
    depth: 0,
    overrideAccess: true,
  });

  if (resolveId(existingVariant.owner) !== ownerId) {
    throw new Error('Variante no encontrada');
  }

  const { totalDocs } = await payload.find({
    collection: 'sales',
    where: { 'items.variant': { equals: id } },
    limit: 1,
    overrideAccess: true,
  });

  if (totalDocs > 0) {
    throw new Error('No se puede eliminar la variante porque tiene ventas asociadas.');
  }

  await payload.delete({
    collection: 'product-variants',
    id,
    overrideAccess: true,
  });

  const variantOwnerId = resolveId(existingVariant.owner) ?? 0;
  try {
    revalidateTag(cacheTags.products(variantOwnerId));
    revalidateTag(cacheTags.saleOptions(variantOwnerId));
  } catch {}
}

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
    depth: 2,
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

async function _getVariantsWithProducts(
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
      limit: 1000,
      select: { createdAt: true },
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
    depth: 2,
    overrideAccess: true,
    select: {
      id: true,
      code: true,
      stock: true,
      costPrice: true,
      profitMargin: true,
      minimumStock: true,
      product: {
        select: {
          id: true,
          name: true,
          brand: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          quality: { select: { id: true, name: true } },
          image: { select: { id: true, url: true } },
          isActive: true,
        },
      } as unknown as true,
      presentation: { select: { id: true, label: true } } as unknown as true,
    },
  });

  return {
    docs: result.docs as PopulatedProductVariant[],
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page!,
  };
}

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
  return unstable_cache(
    async () => _getVariantsWithProducts(ownerId, filters, options),
    ['variants-with-products', String(ownerId), JSON.stringify(filters), JSON.stringify(options)],
    { revalidate: 60 * 2, tags: [cacheTags.products(ownerId)] },
  )();
}

export interface ProductQuotaDependencies {
  transactionID: string | number;
  lock: LockDependencies;
  lockContext: LockContext;
  count: CountDependencies;
  countContext: CountContext;
  findUserById(args: unknown): Promise<User>;
  findSnapshot(args: unknown): Promise<{ docs: TenantEntitlementSnapshot[] }>;
  createProduct(args: unknown): Promise<Product>;
  emitMutation(args: {
    collection: 'entitlement-outbox';
    data: Record<string, unknown>;
    overrideAccess: true;
    context: { entitlementMutation: true };
    req: { transactionID: string | number };
  }): Promise<unknown>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function createProductWithQuota(
  data: CreateProductData,
  ownerId: number,
  dependencies?: ProductQuotaDependencies,
): Promise<Product> {
  if (dependencies) {
    return runCreateProductWithQuota(data, ownerId, dependencies);
  }

  const deps = await defaultProductQuotaDependencies(ownerId);
  try {
    const product = await runCreateProductWithQuota(data, ownerId, deps);
    await deps.commit();
    return product;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

async function runCreateProductWithQuota(
  data: CreateProductData,
  ownerId: number,
  dependencies: ProductQuotaDependencies,
): Promise<Product> {
  const mutationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const snapshot = await resolveTenantSnapshot(dependencies, ownerId);
  const quotas = snapshot ? snapshotQuotas(snapshot) : null;
  const maxProducts = quotas?.maxProducts ?? 0;

  if (maxProducts > 0) {
    const count = await countProducts(dependencies.count, dependencies.countContext);
    if (count >= maxProducts) {
      throw new Error('Límite de productos alcanzado');
    }
  }

  const product = await dependencies.createProduct({
    collection: 'products',
    data: { ...data, owner: ownerId },
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.emitMutation({
    collection: 'entitlement-outbox',
    data: {
      idempotencyKey: `mutation:${ownerId}:${mutationNonce}`,
      kind: 'entitlement.mutation',
      aggregate: `tenant:${ownerId}`,
      payload: { tenantId: ownerId, nonce: mutationNonce },
      state: 'sent',
      attempts: 0,
      availableAt: dependencies.countContext.now,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  return product;
}

async function resolveTenantSnapshot(
  dependencies: ProductQuotaDependencies,
  tenantId: number,
): Promise<TenantEntitlementSnapshot | null> {
  const user = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  const snapshotId =
    typeof user.activeEntitlementSnapshot === 'number'
      ? user.activeEntitlementSnapshot
      : (user.activeEntitlementSnapshot?.id ?? null);
  if (snapshotId === null) return null;

  const result = await dependencies.findSnapshot({
    collection: 'tenant-entitlement-snapshots',
    where: {
      and: [{ tenant: { equals: tenantId } }, { id: { equals: snapshotId } }],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  return result.docs[0] ?? null;
}

async function defaultProductQuotaDependencies(ownerId: number): Promise<ProductQuotaDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  return {
    transactionID,
    lock,
    lockContext: { transactionID, tenantId: ownerId },
    count: {
      findUsers: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findInvitations: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findProducts: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findVariants: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
    },
    countContext: { transactionID, tenantId: ownerId, now: new Date().toISOString() },
    findUserById: async (args) => payload.findByID(args as never) as unknown as Promise<User>,
    findSnapshot: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: TenantEntitlementSnapshot[] }>,
    createProduct: async (args) => payload.create(args as never) as unknown as Promise<Product>,
    emitMutation: async (args) => payload.create(args as never) as unknown,
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}
