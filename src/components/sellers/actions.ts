'use server';

import { z } from 'zod';

import { createInvitation } from '@/app/services/invitations';
import { deleteSeller, updateSeller } from '@/app/services/users';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';

const inviteSellerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
});

export const inviteSellerAction = actionClient.schema(inviteSellerSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const ownerId = user.role === 'owner' ? user.id : user.id;

  await createInvitation(parsedInput.email, ownerId);

  return { success: true };
});

const updateSellerSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'El nombre es requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  isActive: z.boolean().optional(),
  phone: z.string().max(20, 'Máximo 20 caracteres').optional(),
  dni: z
    .string()
    .regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos')
    .optional()
    .or(z.literal('')),
  cuitCuil: z
    .string()
    .regex(/^\d{2}-\d{8}-\d{1}$/, 'Formato inválido. Usar XX-XXXXXXXX-X')
    .optional()
    .or(z.literal('')),
  cbu: z.string().max(50, 'Máximo 50 caracteres').optional().or(z.literal('')),
});

export const updateSellerAction = actionClient.schema(updateSellerSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  const { id, ...data } = parsedInput;
  const seller = await updateSeller(id, data);

  return { success: true, seller };
});

const deleteSellerSchema = z.object({
  id: z.number(),
});

export const deleteSellerAction = actionClient.schema(deleteSellerSchema).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('No autorizado');
  }

  await deleteSeller(parsedInput.id);

  return { success: true };
});
