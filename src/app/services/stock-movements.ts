'use server';

import { endOfDay, startOfDay } from 'date-fns';
import type { Where } from 'payload';

import { notifyEvent } from '@/lib/notify';
import { getPayloadClient } from '@/lib/payload';
import type { Product, ProductVariant, StockMovement, User } from '@/payload-types';

export type MovementType =
  | 'entry'
  | 'exit'
  | 'adjustment'
  | 'sale'
  | 'dispatch_to_mobile'
  | 'return_from_mobile'
  | 'sale_cancelled'
  | 'sale_edit';

export interface HistoryMovement {
  id: number;
  createdAt: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string | null;
  variantCode: string | null;
  productName: string;
  sellerName: string | null;
  createdByName: string;
}

export interface HistoryResult {
  docs: HistoryMovement[];
  totalDocs: number;
  totalPages: number;
  page: number;
}

export interface HistoryFilters {
  from?: Date;
  to?: Date;
  types?: MovementType[];
  page?: number;
  limit?: number;
}

interface RegisterStockMovementParams {
  variantId: number;
  type: 'entry' | 'exit' | 'adjustment';
  quantity: number;
  reason?: string;
  createdById: number;
  ownerId: number;
}

export async function registerStockMovement(
  params: RegisterStockMovementParams,
): Promise<{ success: true; movement: StockMovement; newStock: number }> {
  const { variantId, type, quantity, reason, createdById, ownerId } = params;
  const payload = await getPayloadClient();

  const variant = await payload.findByID({
    collection: 'product-variants',
    id: variantId,
    depth: 1,
    overrideAccess: true,
  });

  if (!variant) {
    throw new Error('Variante no encontrada');
  }

  const previousStock = variant.stock;

  let newStock: number;
  switch (type) {
    case 'entry':
      newStock = previousStock + quantity;
      break;
    case 'exit':
      newStock = previousStock - quantity;
      break;
    case 'adjustment':
      newStock = quantity;
      break;
    default:
      throw new Error('Tipo de movimiento inválido');
  }

  if (newStock < 0) {
    throw new Error('El stock no puede ser negativo');
  }

  const movement = await payload.create({
    collection: 'stock-movements',
    data: {
      variant: variantId,
      type,
      quantity: type === 'adjustment' ? quantity - previousStock : quantity,
      previousStock,
      newStock,
      reason: reason || '',
      owner: ownerId,
      createdBy: createdById,
    },
    overrideAccess: true,
  });

  await payload.update({
    collection: 'product-variants',
    id: variantId,
    data: {
      stock: newStock,
    },
    overrideAccess: true,
  });

  const productName = typeof variant.product === 'object' ? variant.product.name : `Variante ${variantId}`;

  const typeLabels: Record<'entry' | 'exit' | 'adjustment', string> = {
    entry: 'Entrada',
    exit: 'Salida',
    adjustment: 'Ajuste',
  };

  await notifyEvent({
    recipientId: ownerId,
    ownerId,
    type: 'stock_adjusted',
    title: 'Movimiento de stock',
    body: `${typeLabels[type]} de ${quantity} unidades de ${productName}`,
    metadata: { variantId, type, quantity, newStock, ownerId },
  });

  if (variant.minimumStock && variant.minimumStock > 0 && newStock > 0 && newStock <= variant.minimumStock) {
    await notifyEvent({
      recipientId: ownerId,
      ownerId,
      type: 'stock_low',
      title: 'Stock bajo',
      body: `Stock bajo: ${productName} — quedan ${newStock} unidades`,
      metadata: { variantId, newStock, minimumStock: variant.minimumStock },
    });
  }

  return {
    success: true,
    movement,
    newStock,
  };
}

export async function getHistoryMovements(ownerId: number, filters: HistoryFilters = {}): Promise<HistoryResult> {
  const { from, to, types, page = 1, limit = 25 } = filters;
  const payload = await getPayloadClient();

  const conditions: Where[] = [{ owner: { equals: ownerId } }];
  if (from) conditions.push({ createdAt: { greater_than_equal: startOfDay(from).toISOString() } });
  if (to) conditions.push({ createdAt: { less_than_equal: endOfDay(to).toISOString() } });
  if (types && types.length > 0) conditions.push({ type: { in: types } });

  const result = await payload.find({
    collection: 'stock-movements',
    where: { and: conditions },
    sort: '-createdAt',
    page,
    limit,
    depth: 2,
    overrideAccess: true,
  });

  const docs: HistoryMovement[] = result.docs.map((m) => {
    const variant = typeof m.variant === 'object' ? (m.variant as ProductVariant) : null;
    const product = variant && typeof variant.product === 'object' ? (variant.product as Product) : null;
    const mobileSeller = m.mobileSeller && typeof m.mobileSeller === 'object' ? (m.mobileSeller as User) : null;
    const createdBy = typeof m.createdBy === 'object' ? (m.createdBy as User) : null;

    return {
      id: m.id,
      createdAt: m.createdAt,
      type: m.type as MovementType,
      quantity: m.quantity,
      previousStock: m.previousStock,
      newStock: m.newStock,
      reason: m.reason ?? null,
      variantCode: variant?.code ?? null,
      productName: product?.name ?? '—',
      sellerName: mobileSeller?.name ?? null,
      createdByName: createdBy?.name ?? '—',
    };
  });

  return {
    docs,
    totalDocs: result.totalDocs,
    totalPages: result.totalPages,
    page: result.page ?? page,
  };
}

export async function getStockMovements(ownerId: number, variantId?: number): Promise<StockMovement[]> {
  const payload = await getPayloadClient();

  const result = await payload.find({
    collection: 'stock-movements',
    where: variantId
      ? {
          and: [{ owner: { equals: ownerId } }, { variant: { equals: variantId } }],
        }
      : { owner: { equals: ownerId } },
    sort: '-createdAt',
    limit: 1000,
    overrideAccess: true,
  });

  return result.docs;
}
