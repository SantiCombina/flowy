'use server';

import { revalidatePath } from 'next/cache';

import { registerStockMovement } from '@/app/services/stock-movements';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { registerStockMovementSchema } from '@/schemas/stock-movements/stock-movement-schema';

export const registerStockMovementAction = actionClient
  .schema(registerStockMovementSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    if (user.role !== 'owner' && user.role !== 'admin') {
      throw new Error('No tienes permisos para registrar movimientos de stock');
    }

    const ownerId = user.role === 'owner' ? user.id : (user.owner as number);

    const result = await registerStockMovement({
      variantId: parsedInput.variantId,
      type: parsedInput.type,
      quantity: parsedInput.quantity,
      reason: parsedInput.reason,
      createdById: user.id,
      ownerId,
    });

    revalidatePath('/products');

    return {
      success: true,
      movement: result.movement,
      newStock: result.newStock,
    };
  });
