'use server';

import { getPayloadClient } from '@/lib/payload';
import type { StockMovement } from '@/payload-types';

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

  // Get current variant stock
  const variant = await payload.findByID({
    collection: 'product-variants',
    id: variantId,
    overrideAccess: true,
  });

  if (!variant) {
    throw new Error('Variante no encontrada');
  }

  const previousStock = variant.stock;

  // Calculate new stock based on movement type
  let newStock: number;
  switch (type) {
    case 'entry':
      newStock = previousStock + quantity;
      break;
    case 'exit':
      newStock = previousStock - quantity;
      break;
    case 'adjustment':
      newStock = quantity; // For adjustments, quantity is the new absolute value
      break;
    default:
      throw new Error('Tipo de movimiento inválido');
  }

  // Validate new stock is not negative
  if (newStock < 0) {
    throw new Error('El stock no puede ser negativo');
  }

  // Create stock movement record
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

  // Update variant stock
  await payload.update({
    collection: 'product-variants',
    id: variantId,
    data: {
      stock: newStock,
    },
    overrideAccess: true,
  });

  return {
    success: true,
    movement,
    newStock,
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
