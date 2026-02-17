'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { Brand, Category, Quality } from '@/payload-types';

import type { EntityType } from '../types';

import { EntitySelectField } from './entity-select-field';

interface ProductFormData {
  name: string;
  description?: string;
  brandId?: string;
  categoryId?: string;
  qualityId?: string;
  isActive: boolean;
  variants: Array<{
    id?: number;
    presentationId?: string;
    code?: string;
    stock: number;
    minStock: number;
    price: number;
  }>;
}

interface ProductAttributesSectionProps {
  control: Control<ProductFormData>;
  brands: Brand[];
  categories: Category[];
  qualities: Quality[];
  onCreateEntity: (type: EntityType) => void;
  onDeleteEntity: (type: EntityType, id: number, name: string) => void;
}

export function ProductAttributesSection({
  control,
  brands,
  categories,
  qualities,
  onCreateEntity,
  onDeleteEntity,
}: ProductAttributesSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Atributos</h3>

      <div className="space-y-4">
        <Controller
          name="brandId"
          control={control}
          render={({ field }) => (
            <EntitySelectField
              label="Marca"
              value={field.value}
              onChange={field.onChange}
              options={brands.map((b) => ({ id: b.id, name: b.name }))}
              entityType="brand"
              onCreateEntity={onCreateEntity}
              onDeleteEntity={onDeleteEntity}
              emptyMessage="Sin marcas"
            />
          )}
        />

        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <EntitySelectField
              label="Categoría"
              value={field.value}
              onChange={field.onChange}
              options={categories.map((c) => ({ id: c.id, name: c.name }))}
              entityType="category"
              onCreateEntity={onCreateEntity}
              onDeleteEntity={onDeleteEntity}
              emptyMessage="Sin categorías"
            />
          )}
        />

        <Controller
          name="qualityId"
          control={control}
          render={({ field }) => (
            <EntitySelectField
              label="Calidad"
              value={field.value}
              onChange={field.onChange}
              options={qualities.map((q) => ({ id: q.id, name: q.name }))}
              entityType="quality"
              onCreateEntity={onCreateEntity}
              onDeleteEntity={onDeleteEntity}
              emptyMessage="Sin calidades"
            />
          )}
        />
      </div>
    </div>
  );
}
