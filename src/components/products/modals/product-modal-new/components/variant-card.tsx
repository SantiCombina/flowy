'use client';

import { DollarSign, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculatePrice } from '@/lib/money';
import type { ProductFormData } from '@/schemas/products/product-schema';

import type { VariantCardProps } from '../types';

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
  const { control, setValue } = useFormContext<ProductFormData>();
  const presentationId = useWatch({ control, name: `variants.${index}.presentationId` }) ?? '';
  const costPrice = useWatch({ control, name: `variants.${index}.costPrice` }) ?? 0;
  const profitMargin = useWatch({ control, name: `variants.${index}.profitMargin` }) ?? 0;
  const suggestedPrice = costPrice > 0 ? calculatePrice(costPrice, profitMargin) : null;

  const [isCreatingPresentation, setIsCreatingPresentation] = useState(false);
  const [newPresentationName, setNewPresentationName] = useState('');
  const [isSubmittingPresentation, setIsSubmittingPresentation] = useState(false);

  const handleCreatePresentation = async () => {
    const trimmed = newPresentationName.trim();
    if (!trimmed) return;

    setIsSubmittingPresentation(true);
    const result = await onCreatePresentation(trimmed);
    setIsSubmittingPresentation(false);

    if (result) {
      setIsCreatingPresentation(false);
      setNewPresentationName('');
    }
  };

  const handleCancelPresentation = () => {
    setIsCreatingPresentation(false);
    setNewPresentationName('');
  };

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
        <div className="flex items-center justify-between mb-2">
          {!isCreatingPresentation && (
            <button
              type="button"
              onClick={() => {
                if (!hasEmptyPresentation) {
                  setIsCreatingPresentation(true);
                  setNewPresentationName('');
                }
              }}
              className={`text-xs flex items-center gap-1 ${
                hasEmptyPresentation ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:underline'
              }`}
              disabled={hasEmptyPresentation}
            >
              <Plus className="h-3 w-3" />
              Nueva presentación
            </button>
          )}
        </div>

        {isCreatingPresentation ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newPresentationName}
              onChange={(e) => setNewPresentationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreatePresentation();
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCreatePresentation()}
                disabled={!newPresentationName.trim() || isSubmittingPresentation}
              >
                {isSubmittingPresentation ? 'Creando' : 'Crear'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelPresentation}
                disabled={isSubmittingPresentation}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Select
            onValueChange={(newValue) => {
              if (newValue === '__clear__') {
                setValue(`variants.${index}.presentationId`, '');
                return;
              }
              setValue(`variants.${index}.presentationId`, newValue);
            }}
            value={presentationId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
              {presentationId && (
                <SelectItem value="__clear__" className="text-muted-foreground cursor-pointer">
                  ✕ Sin presentación
                </SelectItem>
              )}
              {presentations.length === 0 ? (
                <SelectItem value="_empty" disabled></SelectItem>
              ) : (
                presentations.map((pres) => (
                  <SelectItem
                    key={pres.id}
                    value={pres.id.toString()}
                    className="pr-16"
                    disabled={usedPresentationIds.includes(pres.id.toString())}
                  >
                    <SelectItemText>{pres.label}</SelectItemText>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeletePresentation(pres.id, pres.label);
                      }}
                      className="absolute right-8 p-1 rounded hover:bg-destructive/10 text-destructive transition-colors z-10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
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
                  <Input type="number" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
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
                  <Input type="number" min={0} {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <div className="min-h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="border-t pt-3">
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
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      className="pr-10"
                      {...field}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
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
      </div>

      <div className="rounded-lg bg-muted/50 border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Precio de venta sugerido</span>
        </div>
        <span className="text-lg font-bold tabular-nums">
          {suggestedPrice !== null
            ? `$ ${suggestedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '$ —'}
        </span>
      </div>
    </div>
  );
}
