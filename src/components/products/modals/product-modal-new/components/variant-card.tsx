'use client';

import { Trash2 } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { PriceInput } from '@/components/ui/price-input';
import { calculatePrice } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { ProductFormData } from '@/schemas/products/product-schema';

import type { VariantCardProps } from '../types';

import { EntitySelectField } from './entity-select-field';

interface ExtendedVariantCardProps extends VariantCardProps {
  usedPresentationIds: string[];
}

export function VariantCard({
  index,
  canDelete,
  onDelete,
  presentations,
  onCreatePresentation,
  onDeletePresentation,
  hasEmptyPresentation,
  usedPresentationIds,
}: ExtendedVariantCardProps) {
  const { control } = useFormContext<ProductFormData>();
  const costPrice = useWatch({ control, name: `variants.${index}.costPrice` }) ?? 0;
  const profitMargin = useWatch({ control, name: `variants.${index}.profitMargin` }) ?? 0;
  const suggestedPrice = costPrice > 0 ? calculatePrice(costPrice, profitMargin) : null;

  return (
    <div className="relative rounded-xl border bg-card p-4 shadow-sm space-y-4">
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(index)}
          className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <div className="pr-8">
        <FormField
          control={control}
          name={`variants.${index}.presentationId`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Presentación</FormLabel>
              <EntitySelectField
                label="Presentación"
                value={field.value}
                onChange={field.onChange}
                options={presentations.map((p) => ({ id: p.id, name: p.label }))}
                entityType="presentation"
                onCreate={onCreatePresentation}
                onDeleteEntity={(_type, id, name) => onDeletePresentation(id, name)}
                emptyMessage="Sin presentaciones"
                disabledCreate={hasEmptyPresentation}
                disabledOptionIds={usedPresentationIds}
              />
              <div className="min-h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`variants.${index}.code`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-muted font-mono text-sm font-medium tracking-wide placeholder:text-muted-foreground/70"
                />
              </FormControl>
              <div className="min-h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={control}
            name={`variants.${index}.stock`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Stock <span className="text-sky">*</span>
                </FormLabel>
                <FormControl>
                  <NumberInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                </FormControl>
                <div className="min-h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`variants.${index}.minimumStock`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock mínimo</FormLabel>
                <FormControl>
                  <NumberInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} min={0} />
                </FormControl>
                <div className="min-h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`variants.${index}.costPrice`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Precio de costo <span className="text-sky">*</span>
              </FormLabel>
              <FormControl>
                <PriceInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
              </FormControl>
              <div className="min-h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`variants.${index}.profitMargin`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Margen de ganancia</FormLabel>
              <FormControl>
                <div className="relative">
                  <NumberInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    min={0}
                    step={0.1}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
              </FormControl>
              <div className="min-h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Precio de venta sugerido</span>
        <span
          className={cn(
            'text-lg font-bold tabular-nums',
            suggestedPrice === null && 'font-normal text-muted-foreground/60',
          )}
        >
          {suggestedPrice !== null
            ? `$ ${suggestedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'}
        </span>
      </div>
    </div>
  );
}
