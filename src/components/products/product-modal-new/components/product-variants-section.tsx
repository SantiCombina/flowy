'use client';

import { Plus } from 'lucide-react';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import type { Presentation } from '@/payload-types';

import { VariantCard } from './variant-card';

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
    minimumStock: number;
    costPrice: number;
    profitMargin: number;
  }>;
}

interface ProductVariantsSectionProps {
  fields: Array<Record<string, unknown> & { id: string }>;
  errors: FieldErrors<ProductFormData>;
  register: UseFormRegister<ProductFormData>;
  control: Control<ProductFormData>;
  onAddVariant: () => void;
  onRemoveVariant: (index: number) => void;
  presentations: Presentation[];
  onCreatePresentation: (name: string) => Promise<{ id: number; name: string } | null>;
  onDeletePresentation: (id: number, label: string) => void;
  hasEmptyPresentation: boolean;
}

export function ProductVariantsSection({
  fields,
  errors,
  register,
  control,
  onAddVariant,
  onRemoveVariant,
  presentations,
  onCreatePresentation,
  onDeletePresentation,
  hasEmptyPresentation,
}: ProductVariantsSectionProps) {
  const variants = useWatch({ control, name: 'variants' });
  const canAddVariant = !variants?.some((v) => !v?.presentationId);

  const getUsedPresentationIds = (currentIndex: number) => {
    const ids: string[] = [];
    variants?.forEach((v, i) => {
      if (i !== currentIndex && v?.presentationId) {
        ids.push(v.presentationId);
      }
    });
    return ids;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Presentaciones y precios
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={onAddVariant} disabled={!canAddVariant}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar presentación
        </Button>
      </div>

      {errors.variants && <p className="text-sm text-destructive">{errors.variants.message}</p>}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <VariantCard
            key={field.id}
            index={index}
            canDelete={fields.length > 1}
            onDelete={onRemoveVariant}
            presentations={presentations}
            onCreatePresentation={onCreatePresentation}
            onDeletePresentation={onDeletePresentation}
            hasEmptyPresentation={hasEmptyPresentation}
            usedPresentationIds={getUsedPresentationIds(index)}
            register={register}
            control={control}
            errors={errors}
          />
        ))}
      </div>
    </div>
  );
}
