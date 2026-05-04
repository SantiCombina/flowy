'use server';

import { z } from 'zod';

import {
  createCommissionPayment,
  getCommissionPayments,
  getCommissionSummary,
  getSellersCommissionSummaries,
} from '@/app/services/commissions';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import { registerCommissionPaymentSchema } from '@/schemas/commissions/register-payment-schema';

export const getCommissionSummaryAction = actionClient.action(async () => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const summaries = await getSellersCommissionSummaries(user.id);

  return { success: true, summaries: Object.fromEntries(summaries) };
});

const commissionDetailSchema = z.object({
  sellerId: z
    .number({
      required_error: 'El vendedor es requerido.',
      invalid_type_error: 'El vendedor debe ser un número.',
    })
    .int()
    .positive(),
  year: z
    .number({
      required_error: 'El año es requerido.',
      invalid_type_error: 'El año debe ser un número.',
    })
    .int()
    .min(2020)
    .max(2100),
  month: z
    .number({
      required_error: 'El mes es requerido.',
      invalid_type_error: 'El mes debe ser un número.',
    })
    .int()
    .min(1)
    .max(12),
});

export const getCommissionDetailAction = actionClient.schema(commissionDetailSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const period = { year: parsedInput.year, month: parsedInput.month };

  const [summary, payments] = await Promise.all([
    getCommissionSummary(parsedInput.sellerId, user.id, period),
    getCommissionPayments(parsedInput.sellerId, user.id, period),
  ]);

  return { success: true, summary, payments };
});

export const registerCommissionPaymentAction = actionClient
  .schema(registerCommissionPaymentSchema)
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();

    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      throw new Error('No autorizado');
    }

    const summary = await getCommissionSummary(parsedInput.sellerId, user.id);

    if (parsedInput.amount > summary.pendingBalance) {
      throw new Error(
        `El monto no puede superar el saldo pendiente ($${summary.pendingBalance.toLocaleString('es-AR')})`,
      );
    }

    await createCommissionPayment(parsedInput.sellerId, user.id, {
      amount: parsedInput.amount,
      date: parsedInput.date,
      paymentMethod: parsedInput.paymentMethod,
      reference: parsedInput.reference || undefined,
      notes: parsedInput.notes || undefined,
    });

    return { success: true };
  });
