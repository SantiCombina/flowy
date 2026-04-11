'use server';

import { revalidateTag, unstable_cache } from 'next/cache';

import { getPayloadClient } from '@/lib/payload';
import type { Brand, Category, Presentation, Quality } from '@/payload-types';

export const getBrands = unstable_cache(
  async (ownerId: number): Promise<Brand[]> => {
    const payload = await getPayloadClient();

    const result = await payload.find({
      collection: 'brands',
      where: { owner: { equals: ownerId } },
      sort: 'name',
      limit: 1000,
      overrideAccess: true,
    });

    return result.docs;
  },
  ['entities-brands'],
  { revalidate: 60 * 10, tags: ['entities-brands'] },
);

export async function createBrand(name: string, ownerId: number): Promise<Brand> {
  const payload = await getPayloadClient();

  const brand = await payload.create({
    collection: 'brands',
    data: { name, owner: ownerId },
    overrideAccess: true,
  });

  revalidateTag('entities-brands');
  return brand;
}

export async function updateBrand(id: number, name: string): Promise<Brand> {
  const payload = await getPayloadClient();

  const brand = await payload.update({
    collection: 'brands',
    id,
    data: { name },
    overrideAccess: true,
  });

  revalidateTag('entities-brands');
  return brand;
}

export async function deleteBrand(id: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({ collection: 'brands', id, overrideAccess: true });
  revalidateTag('entities-brands');
}

export const getCategories = unstable_cache(
  async (ownerId: number): Promise<Category[]> => {
    const payload = await getPayloadClient();

    const result = await payload.find({
      collection: 'categories',
      where: { owner: { equals: ownerId } },
      sort: 'name',
      limit: 1000,
      overrideAccess: true,
    });

    return result.docs;
  },
  ['entities-categories'],
  { revalidate: 60 * 10, tags: ['entities-categories'] },
);

export async function createCategory(name: string, ownerId: number): Promise<Category> {
  const payload = await getPayloadClient();

  const category = await payload.create({
    collection: 'categories',
    data: { name, owner: ownerId },
    overrideAccess: true,
  });

  revalidateTag('entities-categories');
  return category;
}

export async function updateCategory(id: number, name: string): Promise<Category> {
  const payload = await getPayloadClient();

  const category = await payload.update({
    collection: 'categories',
    id,
    data: { name },
    overrideAccess: true,
  });

  revalidateTag('entities-categories');
  return category;
}

export async function deleteCategory(id: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({ collection: 'categories', id, overrideAccess: true });
  revalidateTag('entities-categories');
}

export const getQualities = unstable_cache(
  async (ownerId: number): Promise<Quality[]> => {
    const payload = await getPayloadClient();

    const result = await payload.find({
      collection: 'qualities',
      where: { owner: { equals: ownerId } },
      sort: 'name',
      limit: 1000,
      overrideAccess: true,
    });

    return result.docs;
  },
  ['entities-qualities'],
  { revalidate: 60 * 10, tags: ['entities-qualities'] },
);

export async function createQuality(name: string, ownerId: number): Promise<Quality> {
  const payload = await getPayloadClient();

  const quality = await payload.create({
    collection: 'qualities',
    data: { name, owner: ownerId },
    overrideAccess: true,
  });

  revalidateTag('entities-qualities');
  return quality;
}

export async function updateQuality(id: number, name: string): Promise<Quality> {
  const payload = await getPayloadClient();

  const quality = await payload.update({
    collection: 'qualities',
    id,
    data: { name },
    overrideAccess: true,
  });

  revalidateTag('entities-qualities');
  return quality;
}

export async function deleteQuality(id: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({ collection: 'qualities', id, overrideAccess: true });
  revalidateTag('entities-qualities');
}

export const getPresentations = unstable_cache(
  async (ownerId: number): Promise<Presentation[]> => {
    const payload = await getPayloadClient();

    const result = await payload.find({
      collection: 'presentations',
      where: { owner: { equals: ownerId } },
      sort: 'label',
      limit: 1000,
      overrideAccess: true,
    });

    return result.docs;
  },
  ['entities-presentations'],
  { revalidate: 60 * 10, tags: ['entities-presentations'] },
);

export async function createPresentation(
  label: string,
  ownerId: number,
  options?: { amount?: number; unit?: string },
): Promise<Presentation> {
  const payload = await getPayloadClient();

  const presentation = await payload.create({
    collection: 'presentations',
    data: { label, amount: options?.amount ?? 1, unit: options?.unit ?? 'unidad', owner: ownerId },
    overrideAccess: true,
  });

  revalidateTag('entities-presentations');
  return presentation;
}

export async function updatePresentation(id: number, label: string): Promise<Presentation> {
  const payload = await getPayloadClient();

  const presentation = await payload.update({
    collection: 'presentations',
    id,
    data: { label },
    overrideAccess: true,
  });

  revalidateTag('entities-presentations');
  return presentation;
}

export async function deletePresentation(id: number): Promise<void> {
  const payload = await getPayloadClient();

  await payload.delete({ collection: 'presentations', id, overrideAccess: true });
  revalidateTag('entities-presentations');
}
