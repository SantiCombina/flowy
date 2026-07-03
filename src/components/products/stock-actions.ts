'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { registerStockMovement } from '@/app/services/stock-movements';
import { getCurrentUser } from '@/lib/payload';
import { resolveId } from '@/lib/payload-utils';
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

    const ownerId = user.role === 'owner' ? user.id : resolveId(user.owner);

    if (!ownerId) throw new Error('No se pudo determinar el dueño');

    const result = await registerStockMovement({
      variantId: parsedInput.variantId,
      type: parsedInput.type,
      quantity: parsedInput.quantity,
      reason: parsedInput.reason,
      createdById: user.id,
      ownerId,
    });

    revalidatePath('/products');
    revalidateTag('dashboard');

    return {
      success: true,
      movement: result.movement,
      newStock: result.newStock,
    };
  });
