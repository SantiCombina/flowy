'use client';

import { useFormContext } from 'react-hook-form';

import { FormField, FormItem, FormLabel } from '@/components/ui/form';
import type { Brand, Category, Quality } from '@/payload-types';
import type { ProductFormData } from '@/schemas/products/product-schema';

import type { EntityType } from '../types';

import { EntitySelectField } from './entity-select-field';

interface ProductAttributesSectionProps {
  brands: Brand[];
  categories: Category[];
  qualities: Quality[];
  onCreateEntity: (type: EntityType, name: string) => Promise<{ id: number; name: string } | null>;
  onDeleteEntity: (type: EntityType, id: number, name: string) => void;
}

export function ProductAttributesSection({
  brands,
  categories,
  qualities,
  onCreateEntity,
  onDeleteEntity,
}: ProductAttributesSectionProps) {
  const { control } = useFormContext<ProductFormData>();

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b">
        Clasificación
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={control}
          name="brandId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Marca</FormLabel>
              <EntitySelectField
                label="Marca"
                value={field.value}
                onChange={field.onChange}
                options={brands.map((b) => ({ id: b.id, name: b.name }))}
                entityType="brand"
                onCreate={(name) => onCreateEntity('brand', name)}
                onDeleteEntity={onDeleteEntity}
                emptyMessage=""
              />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Categoría</FormLabel>
              <EntitySelectField
                label="Categoría"
                value={field.value}
                onChange={field.onChange}
                options={categories.map((c) => ({ id: c.id, name: c.name }))}
                entityType="category"
                onCreate={(name) => onCreateEntity('category', name)}
                onDeleteEntity={onDeleteEntity}
                emptyMessage=""
              />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="qualityId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Calidad</FormLabel>
              <EntitySelectField
                label="Calidad"
                value={field.value}
                onChange={field.onChange}
                options={qualities.map((q) => ({ id: q.id, name: q.name }))}
                entityType="quality"
                onCreate={(name) => onCreateEntity('quality', name)}
                onDeleteEntity={onDeleteEntity}
                emptyMessage=""
              />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
