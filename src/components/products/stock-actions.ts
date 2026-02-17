'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { registerStockMovement } from '@/app/services/stock-movements';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';

const registerStockMovementSchema = z.object({
  variantId: z.number().positive('ID de variante inválido'),
  type: z.enum(['entry', 'exit', 'adjustment'], {
    required_error: 'El tipo de movimiento es requerido',
  }),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  reason: z.string().optional(),
});

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
