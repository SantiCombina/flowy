'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createBrand,
  updateBrand,
  deleteBrand,
  createCategory,
  updateCategory,
  deleteCategory,
  createQuality,
  updateQuality,
  deleteQuality,
  createPresentation,
  updatePresentation,
  deletePresentation,
} from '@/app/services/entities';
import { getCurrentUser } from '@/lib/payload';
import { actionClient } from '@/lib/safe-action';
import type { Brand, Category, Quality, Presentation } from '@/payload-types';

export const createBrandAction = actionClient
  .schema(z.object({ name: z.string().min(1, 'El nombre es requerido') }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const brand: Brand = await createBrand(parsedInput.name, user.id);
    revalidatePath('/products');
    return { success: true, brand };
  });

export const updateBrandAction = actionClient
  .schema(z.object({ id: z.number(), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const brand: Brand = await updateBrand(parsedInput.id, parsedInput.name);
    revalidatePath('/products');
    return { success: true, brand };
  });

export const createCategoryAction = actionClient
  .schema(z.object({ name: z.string().min(1, 'El nombre es requerido') }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const category: Category = await createCategory(parsedInput.name, user.id);
    revalidatePath('/products');
    return { success: true, category };
  });

export const updateCategoryAction = actionClient
  .schema(z.object({ id: z.number(), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const category: Category = await updateCategory(parsedInput.id, parsedInput.name);
    revalidatePath('/products');
    return { success: true, category };
  });

export const createQualityAction = actionClient
  .schema(z.object({ name: z.string().min(1, 'El nombre es requerido') }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const quality: Quality = await createQuality(parsedInput.name, user.id);
    revalidatePath('/products');
    return { success: true, quality };
  });

export const updateQualityAction = actionClient
  .schema(z.object({ id: z.number(), name: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const quality: Quality = await updateQuality(parsedInput.id, parsedInput.name);
    revalidatePath('/products');
    return { success: true, quality };
  });

export const createPresentationAction = actionClient
  .schema(z.object({ label: z.string().min(1, 'El nombre es requerido') }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const presentation: Presentation = await createPresentation(parsedInput.label, user.id);
    revalidatePath('/products');
    return { success: true, presentation };
  });

export const updatePresentationAction = actionClient
  .schema(z.object({ id: z.number(), label: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    const presentation: Presentation = await updatePresentation(parsedInput.id, parsedInput.label);
    revalidatePath('/products');
    return { success: true, presentation };
  });

export const deleteBrandAction = actionClient.schema(z.object({ id: z.number() })).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();
  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await deleteBrand(parsedInput.id);
  revalidatePath('/products');
  return { success: true };
});

export const deleteCategoryAction = actionClient
  .schema(z.object({ id: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    await deleteCategory(parsedInput.id);
    revalidatePath('/products');
    return { success: true };
  });

export const deleteQualityAction = actionClient.schema(z.object({ id: z.number() })).action(async ({ parsedInput }) => {
  const user = await getCurrentUser();
  if (!user || user.role !== 'owner') {
    throw new Error('No autorizado');
  }

  await deleteQuality(parsedInput.id);
  revalidatePath('/products');
  return { success: true };
});

export const deletePresentationAction = actionClient
  .schema(z.object({ id: z.number() }))
  .action(async ({ parsedInput }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== 'owner') {
      throw new Error('No autorizado');
    }

    await deletePresentation(parsedInput.id);
    revalidatePath('/products');
    return { success: true };
  });
