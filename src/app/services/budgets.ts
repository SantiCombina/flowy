'use server';

import { revalidateTag } from 'next/cache';
import type { Where } from 'payload';

import { getPayloadClient } from '@/lib/payload';
import { resolveId } from '@/lib/payload-utils';
import type { Budget } from '@/payload-types';
import type { BudgetValues } from '@/schemas/budgets/budget-schema';

import { getSaleOptions } from './sales';

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

  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
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
      await payload.update({
        collection: 'clients',
        id: data.clientId,
        data: { phone: data.clientPhone },
        overrideAccess: true,
      });
    } catch {}
  }

  try {
    revalidateTag('budgets');
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
        subtotal: item.quantity * item.unitPrice,
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
        subtotal: item.quantity * item.unitPrice,
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

export async function getBudgetById(budgetId: number): Promise<Budget | null> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 2,
    overrideAccess: true,
  });

  return budget as Budget | null;
}

export async function updateBudgetStatus(
  budgetId: number,
  status: 'pending' | 'approved' | 'rejected' | 'converted',
): Promise<void> {
  const payload = await getPayloadClient();

  await payload.update({
    collection: 'budgets',
    id: budgetId,
    data: { status },
    overrideAccess: true,
  });

  try {
    revalidateTag('budgets');
  } catch {}
}

export async function updateBudget(budgetId: number, data: BudgetValues): Promise<void> {
  const payload = await getPayloadClient();

  const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
      await payload.update({
        collection: 'clients',
        id: data.clientId,
        data: { phone: data.clientPhone },
        overrideAccess: true,
      });
    } catch {}
  }

  try {
    revalidateTag('budgets');
  } catch {}
}

export async function deleteBudget(budgetId: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({
    collection: 'budgets',
    id: budgetId,
    overrideAccess: true,
  });

  try {
    revalidateTag('budgets');
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

export async function getBudgetConvertData(budgetId: number, sellerId: number): Promise<BudgetConvertData> {
  const payload = await getPayloadClient();

  const budget = await payload.findByID({
    collection: 'budgets',
    id: budgetId,
    depth: 2,
    overrideAccess: true,
  });

  if (!budget) throw new Error('Presupuesto no encontrado');

  const variantIds = budget.items.map((item) => resolveId(item.variant) ?? 0);

  const [variantsResult, inventoryResult] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { id: { in: variantIds } },
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

    const currentPrice = variant ? variant.costPrice * (1 + (variant.profitMargin ?? 0) / 100) : item.unitPrice;

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
