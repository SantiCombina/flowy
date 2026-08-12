'use server';

import { revalidateTag, unstable_cache } from 'next/cache';
import type { Where } from 'payload';

import { cacheTags } from '@/lib/cache-tags';
import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import { calculatePrice, multiplyMoney, roundMoney } from '@/lib/money';
import { resolveId } from '@/lib/payload-utils';
import { formatCurrency } from '@/lib/utils';
import type { Budget, ProductVariant, Sale } from '@/payload-types';
import type { BudgetValues } from '@/schemas/budgets/budget-schema';

import { getSaleOptions } from './sales';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export interface BudgetItemDetail {
  variantId: number;
  variantName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface BudgetRow {
  id: number;
  date: string;
  sellerId: number;
  sellerName: string;
  clientId?: number;
  clientName?: string;
  clientPhone?: string;
  itemCount: number;
  total: number;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  validUntil?: string;
  notes?: string;
  items: BudgetItemDetail[];
}

export async function createBudget(sellerId: number, ownerId: number, data: BudgetValues): Promise<Budget> {
  const payload = await getPayloadClient();

  const total = roundMoney(data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const now = new Date().toISOString();

  const budget = await payload.create({
    collection: 'budgets',
    data: {
      seller: sellerId,
      owner: ownerId,
      date: now,
      ...(data.clientId ? { client: data.clientId } : {}),
      ...(data.clientPhone ? { clientPhone: data.clientPhone } : {}),
      items: data.items.map((item) => ({
        variant: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      total,
      status: 'pending',
      ...(data.validUntil ? { validUntil: data.validUntil } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    },
    overrideAccess: true,
  });

  if (data.saveClientPhone && data.clientPhone && data.clientId) {
    try {
      const client = await payload.findByID({
        collection: 'clients',
        id: data.clientId,
        depth: 0,
        overrideAccess: true,
      });
      if (client && resolveId(client.owner) === ownerId) {
        await payload.update({
          collection: 'clients',
          id: data.clientId,
          data: { phone: data.clientPhone },
          overrideAccess: true,
        });
      }
    } catch {}
  }

  try {
    revalidateTag(cacheTags.budgets());
  } catch {}

  return budget as Budget;
}

export async function getBudgets(ownerId: number): Promise<BudgetRow[]> {
  const payload = await getPayloadClient();

  const whereClause: Where = { owner: { equals: ownerId } };

  const result = await payload.find({
    collection: 'budgets',
    where: whereClause,
    sort: '-date',
    depth: 2,
    limit: 500,
    overrideAccess: true,
  });

  return (result.docs as Budget[]).map((budget) => {
    const seller = typeof budget.seller === 'object' ? budget.seller : null;
    const client = budget.client && typeof budget.client === 'object' ? budget.client : null;

    const items: BudgetItemDetail[] = budget.items.map((item) => {
      const variant = typeof item.variant === 'object' ? item.variant : null;
      const variantId = resolveId(item.variant) ?? 0;
      const product = variant && typeof variant.product === 'object' ? variant.product : null;
      const presentation =
        variant?.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

      const productName = product?.name ?? 'Producto desconocido';
      const variantName = presentation?.label ? `${productName} · ${presentation.label}` : productName;

      return {
        variantId,
        variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: multiplyMoney(item.quantity, item.unitPrice),
      };
    });

    return {
      id: budget.id,
      date: budget.date,
      sellerId: resolveId(budget.seller) ?? 0,
      sellerName: seller?.name ?? 'Vendedor desconocido',
      clientId: client?.id ?? undefined,
      clientName: client?.name ?? undefined,
      clientPhone: budget.clientPhone ?? undefined,
      itemCount: budget.items.length,
      total: budget.total,
      status: budget.status,
      validUntil: budget.validUntil ?? undefined,
      notes: budget.notes ?? undefined,
      items,
    };
  });
}

export interface BudgetListFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'converted';
}

export interface BudgetListOptions {
  page?: number;
  limit?: number;
  sort?: string;
  sortDir?: 'asc' | 'desc';
}

function buildSortDirection(sortDir: 'asc' | 'desc' | undefined): '' | '-' {
  return sortDir === 'asc' ? '' : '-';
}

function buildSortField(sort: string | undefined, sortDirValue: 'asc' | 'desc' | undefined): string {
  if (!sort) return '-date';

  const direction = buildSortDirection(sortDirValue);

  switch (sort) {
    case 'date':
      return `${direction}date`;
    case 'total':
      return `${direction}total`;
    case 'status':
      return `${direction}status`;
    case 'seller':
      return `${direction}seller.name`;
    case 'client':
      return `${direction}client.name`;
    case 'items':
      return `${direction}id`;
    default:
      return '-date';
  }
}

async function _getPaginatedBudgets(
  ownerId: number,
  filters: BudgetListFilters,
  options: BudgetListOptions,
): Promise<{
  budgets: BudgetRow[];
  totalCount: number;
  totalPages: number;
  page: number;
}> {
  const payload = await getPayloadClient();

  const conditions: Where[] = [{ owner: { equals: ownerId } }];

  if (filters.dateFrom) {
    conditions.push({ date: { greater_than_equal: filters.dateFrom } });
  }

  if (filters.dateTo) {
    conditions.push({ date: { less_than_equal: filters.dateTo } });
  }

  if (filters.status) {
    conditions.push({ status: { equals: filters.status } });
  }

  const whereClause: Where = conditions.length === 1 ? conditions[0]! : { and: conditions };

  const limit = options.limit ?? 25;
  const page = options.page ?? 1;
  const sort = buildSortField(options.sort, options.sortDir);

  const result = await payload.find({
    collection: 'budgets',
    where: whereClause,
    sort,
    depth: 2,
    limit,
    page,
    overrideAccess: true,
    select: {
      id: true,
      date: true,
      seller: { select: { name: true } } as unknown as true,
      client: { select: { id: true, name: true } } as unknown as true,
      clientPhone: true,
      items: true,
      total: true,
      status: true,
      validUntil: true,
      notes: true,
    },
  });

  const budgets = (result.docs as Budget[]).map((budget) => {
    const seller = typeof budget.seller === 'object' ? budget.seller : null;
    const client = budget.client && typeof budget.client === 'object' ? budget.client : null;

    const items: BudgetItemDetail[] = budget.items.map((item) => {
      const variant = typeof item.variant === 'object' ? item.variant : null;
      const variantId = resolveId(item.variant) ?? 0;
      const product = variant && typeof variant.product === 'object' ? variant.product : null;
      const presentation =
        variant?.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;

      const productName = product?.name ?? 'Producto desconocido';
      const variantName = presentation?.label ? `${productName} · ${presentation.label}` : productName;

      return {
        variantId,
        variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: multiplyMoney(item.quantity, item.unitPrice),
      };
    });

    return {
      id: budget.id,
      date: budget.date,
      sellerId: resolveId(budget.seller) ?? 0,
      sellerName: seller?.name ?? 'Vendedor desconocido',
      clientId: client?.id ?? undefined,
      clientName: client?.name ?? undefined,
      clientPhone: budget.clientPhone ?? undefined,
      itemCount: budget.items.length,
      total: budget.total,
      status: budget.status,
      validUntil: budget.validUntil ?? undefined,
      notes: budget.notes ?? undefined,
      items,
    };
  });

  return {
    budgets,
    totalCount: result.totalDocs,
    totalPages: result.totalPages,
    page,
  };
}

export async function getPaginatedBudgets(
  ownerId: number,
  filters: BudgetListFilters,
  options: BudgetListOptions,
): Promise<{
  budgets: BudgetRow[];
  totalCount: number;
  totalPages: number;
  page: number;
}> {
  return unstable_cache(
    async () => _getPaginatedBudgets(ownerId, filters, options),
    ['paginated-budgets', String(ownerId), JSON.stringify(filters), JSON.stringify(options)],
    { revalidate: 60 * 2, tags: [cacheTags.budgets()] },
  )();
}

export async function getBudgetById(budgetId: number, ownerId: number): Promise<Budget | null> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 2,
    overrideAccess: true,
  });

  if (!budget) return null;
  if (resolveId(budget.owner) !== ownerId) return null;

  return budget as Budget | null;
}

export async function updateBudgetStatus(
  budgetId: number,
  status: 'pending' | 'approved' | 'rejected' | 'converted',
  ownerId: number,
): Promise<void> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 0,
    overrideAccess: true,
  });
  if (!budget || resolveId(budget.owner) !== ownerId) {
    throw new Error('Presupuesto no encontrado');
  }

  await payload.update({
    collection: 'budgets',
    id: budgetId,
    data: { status },
    overrideAccess: true,
  });

  try {
    revalidateTag(cacheTags.budgets());
  } catch {}
}

export async function updateBudget(budgetId: number, data: BudgetValues, ownerId: number): Promise<void> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 0,
    overrideAccess: true,
  });
  if (!budget || resolveId(budget.owner) !== ownerId) {
    throw new Error('Presupuesto no encontrado');
  }

  const total = roundMoney(data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));

  await payload.update({
    collection: 'budgets',
    id: budgetId,
    data: {
      ...(data.clientId ? { client: data.clientId } : { client: null }),
      ...(data.clientPhone ? { clientPhone: data.clientPhone } : { clientPhone: null }),
      items: data.items.map((item) => ({
        variant: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      total,
      ...(data.validUntil ? { validUntil: data.validUntil } : { validUntil: null }),
      ...(data.notes ? { notes: data.notes } : { notes: null }),
    },
    overrideAccess: true,
  });

  if (data.saveClientPhone && data.clientPhone && data.clientId) {
    try {
      const clientCheck = await payload.findByID({
        collection: 'clients',
        id: data.clientId,
        depth: 0,
        overrideAccess: true,
      });
      if (clientCheck && resolveId(clientCheck.owner) === ownerId) {
        await payload.update({
          collection: 'clients',
          id: data.clientId,
          data: { phone: data.clientPhone },
          overrideAccess: true,
        });
      }
    } catch {}
  }

  try {
    revalidateTag(cacheTags.budgets());
  } catch {}
}

export async function deleteBudget(budgetId: number, ownerId: number): Promise<void> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 0,
    overrideAccess: true,
  });
  if (!budget || resolveId(budget.owner) !== ownerId) {
    throw new Error('Presupuesto no encontrado');
  }

  await payload.delete({
    collection: 'budgets',
    id: budgetId,
    overrideAccess: true,
  });

  try {
    revalidateTag(cacheTags.budgets());
  } catch {}
}

export interface BudgetConvertItem {
  variantId: number;
  variantName: string;
  quantity: number;
  budgetUnitPrice: number;
  currentUnitPrice: number;
  warehouseStock: number;
  personalStock: number;
  productName: string;
  brandName?: string;
  presentationLabel?: string;
}

export interface BudgetConvertData {
  budgetId: number;
  clientId?: number;
  clientName?: string;
  notes?: string;
  items: BudgetConvertItem[];
}

export async function getBudgetConvertData(
  budgetId: number,
  sellerId: number,
  ownerId: number,
): Promise<BudgetConvertData> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 2,
    overrideAccess: true,
  });

  if (!budget) throw new Error('Presupuesto no encontrado');
  if (resolveId(budget.owner) !== ownerId) {
    throw new Error('Presupuesto no encontrado');
  }

  const variantIds = budget.items.map((item) => resolveId(item.variant) ?? 0);

  const [variantsResult, inventoryResult] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { and: [{ id: { in: variantIds } }, { owner: { equals: ownerId } }] },
      depth: 2,
      limit: variantIds.length,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'mobile-seller-inventory',
      where: {
        and: [{ seller: { equals: sellerId } }, { variant: { in: variantIds } }],
      },
      limit: variantIds.length,
      overrideAccess: true,
    }),
  ]);

  const variantMap = new Map(variantsResult.docs.map((v) => [v.id, v]));
  const personalStockMap = new Map<number, number>();

  for (const inv of inventoryResult.docs) {
    const vId = resolveId(inv.variant) ?? 0;
    personalStockMap.set(vId, inv.quantity);
  }

  const client = budget.client && typeof budget.client === 'object' ? budget.client : null;

  const items: BudgetConvertItem[] = budget.items.map((item) => {
    const vId = resolveId(item.variant) ?? 0;
    const variant = variantMap.get(vId);

    const product = variant?.product && typeof variant.product === 'object' ? variant.product : null;
    const presentation =
      variant?.presentation && typeof variant.presentation === 'object' ? variant.presentation : null;
    const brand = product?.brand && typeof product.brand === 'object' ? product.brand : null;

    const productName = product?.name ?? 'Producto desconocido';
    const presentationLabel = presentation?.label ?? undefined;
    const brandName = brand?.name ?? undefined;

    const parts = [brandName, productName, presentationLabel].filter(Boolean);
    const variantName = parts.join(' · ');

    const currentPrice = variant ? calculatePrice(variant.costPrice, variant.profitMargin ?? 0) : item.unitPrice;

    return {
      variantId: vId,
      variantName,
      quantity: item.quantity,
      budgetUnitPrice: item.unitPrice,
      currentUnitPrice: currentPrice,
      warehouseStock: variant?.stock ?? 0,
      personalStock: personalStockMap.get(vId) ?? 0,
      productName,
      brandName,
      presentationLabel,
    };
  });

  return {
    budgetId: budget.id,
    clientId: client?.id ?? undefined,
    clientName: client?.name ?? undefined,
    notes: budget.notes ?? undefined,
    items,
  };
}

export { getSaleOptions as getBudgetOptions };

export interface ConvertBudgetDependencies {
  transactionID: string | number;
  now: string;
  lock: LockDependencies;
  lockContext: LockContext;
  findBudgetById(args: unknown): Promise<Budget>;
  findVariants(args: unknown): Promise<{ docs: ProductVariant[] }>;
  updateVariant(args: unknown): Promise<ProductVariant>;
  createStockMovement(args: unknown): Promise<unknown>;
  createSale(args: unknown): Promise<Sale>;
  updateBudget(args: unknown): Promise<Budget>;
  findUserById(args: unknown): Promise<{ name: string }>;
  notifyEvent(args: unknown): Promise<unknown>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function convertBudgetToSale(
  budgetId: number,
  sellerId: number,
  ownerId: number,
  options: { clientId?: number; notes?: string; immediateDelivery?: boolean },
  dependencies?: ConvertBudgetDependencies,
): Promise<Sale> {
  if (dependencies) {
    return runConvertBudgetToSale(budgetId, sellerId, ownerId, options, dependencies);
  }

  const deps = await defaultConvertBudgetDependencies(ownerId);
  try {
    const sale = await runConvertBudgetToSale(budgetId, sellerId, ownerId, options, deps);
    await deps.commit();
    return sale;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

async function runConvertBudgetToSale(
  budgetId: number,
  sellerId: number,
  ownerId: number,
  options: { clientId?: number; notes?: string; immediateDelivery?: boolean },
  dependencies: ConvertBudgetDependencies,
): Promise<Sale> {
  await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const budget = await dependencies.findBudgetById({
    collection: 'budgets',
    id: budgetId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  if (budget.status === 'converted') {
    throw new Error('El presupuesto ya fue convertido');
  }
  if (budget.status === 'rejected') {
    throw new Error('El presupuesto fue rechazado');
  }

  if (resolveId(budget.owner) !== ownerId) {
    throw new Error('Presupuesto no encontrado');
  }

  const variantIds = budget.items.map((item) => resolveId(item.variant) ?? 0);
  const variantsResult = await dependencies.findVariants({
    collection: 'product-variants',
    where: { and: [{ id: { in: variantIds } }, { owner: { equals: ownerId } }] },
    limit: variantIds.length,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  const variantMap = new Map(variantsResult.docs.map((variant) => [variant.id, variant]));

  for (const item of budget.items) {
    const variantId = resolveId(item.variant) ?? 0;
    const variant = variantMap.get(variantId);
    if (!variant) {
      throw new Error(`Variante ${variantId} no encontrada`);
    }
    if (variant.stock < item.quantity) {
      throw new Error(
        `Stock insuficiente en depósito para ${variant.code ?? variantId}. ` +
          `Disponible: ${variant.stock}, requerido: ${item.quantity}`,
      );
    }

    const previousStock = variant.stock;
    const newStock = previousStock - item.quantity;
    variant.stock = newStock;

    await dependencies.updateVariant({
      collection: 'product-variants',
      id: variantId,
      data: { stock: newStock },
      overrideAccess: true,
      req: { transactionID: dependencies.transactionID },
    });

    await dependencies.createStockMovement({
      collection: 'stock-movements',
      data: {
        variant: variantId,
        type: 'sale',
        quantity: item.quantity,
        previousStock,
        newStock,
        owner: ownerId,
        createdBy: sellerId,
      },
      overrideAccess: true,
      req: { transactionID: dependencies.transactionID },
    });
  }

  const total = budget.total;
  const now = dependencies.now;

  const sale = await dependencies.createSale({
    collection: 'sales',
    data: {
      seller: sellerId,
      owner: ownerId,
      sourceBudget: budgetId,
      date: now,
      items: budget.items.map((item) => ({
        variant: resolveId(item.variant) ?? 0,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        stockSource: 'warehouse',
      })),
      total,
      amountPaid: 0,
      paymentStatus: 'pending',
      deliveryStatus: options.immediateDelivery ? 'delivered' : 'pending',
      ...(options.immediateDelivery ? { deliveredAt: now } : {}),
      ...(options.clientId ? { client: options.clientId } : {}),
      ...(options.notes ? { notes: options.notes } : {}),
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.updateBudget({
    collection: 'budgets',
    id: budgetId,
    data: { status: 'converted' },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  const sellerUser = await dependencies.findUserById({
    collection: 'users',
    id: sellerId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.notifyEvent({
    recipientId: ownerId,
    ownerId,
    sellerId,
    type: 'sale_created',
    title: 'Nueva venta',
    body: `Nueva venta de ${sellerUser.name} por ${formatCurrency(total)}`,
    metadata: { saleId: sale.id, total, sellerId, sourceBudget: budgetId },
  });

  return sale;
}

async function defaultConvertBudgetDependencies(ownerId: number): Promise<ConvertBudgetDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  return {
    transactionID,
    now: new Date().toISOString(),
    lock,
    lockContext: { transactionID, tenantId: ownerId },
    findBudgetById: async (args) => payload.findByID(args as never) as unknown as Promise<Budget>,
    findVariants: async (args) => payload.find(args as never) as unknown as Promise<{ docs: ProductVariant[] }>,
    updateVariant: async (args) => payload.update(args as never) as unknown as Promise<ProductVariant>,
    createStockMovement: async (args) => payload.create(args as never) as unknown,
    createSale: async (args) => payload.create(args as never) as unknown as Promise<Sale>,
    updateBudget: async (args) => payload.update(args as never) as unknown as Promise<Budget>,
    findUserById: async (args) => payload.findByID(args as never) as unknown as Promise<{ name: string }>,
    notifyEvent: async (args) => {
      const { notifyEvent } = await import('@/lib/notify');
      return notifyEvent(args as never);
    },
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}
