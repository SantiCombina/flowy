'use client';

import { Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PriceInput } from '@/components/ui/price-input';
import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { VariantCardProps } from '../types';

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

interface ExtendedVariantCardProps extends VariantCardProps {
  control: Control<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
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
  control,
  setValue,
}: ExtendedVariantCardProps) {
  const presentationId = useWatch({ control, name: `variants.${index}.presentationId` }) ?? '';
  const costPrice = useWatch({ control, name: `variants.${index}.costPrice` }) ?? 0;
  const profitMargin = useWatch({ control, name: `variants.${index}.profitMargin` }) ?? 0;
  const suggestedPrice = costPrice > 0 ? costPrice * (1 + profitMargin / 100) : null;

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
    <div className="relative rounded-lg border-l-4 border-l-primary/40 p-4 bg-card space-y-3 shadow-sm">
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(index)}
          className="absolute top-2 right-2 h-8 w-8"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-10">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Presentación</Label>
            {!isCreatingPresentation && (
              <button
                type="button"
                onClick={() => {
                  if (!hasEmptyPresentation) {
                    setIsCreatingPresentation(true);
                    setNewPresentationName('');
                  }
                }}
                className={`text-xs hover:underline flex items-center gap-1 ${
                  hasEmptyPresentation ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'
                }`}
                disabled={hasEmptyPresentation}
              >
                + Nueva presentación
              </button>
            )}
          </div>
          {isCreatingPresentation ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Nombre de la nueva presentación"
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
                  {isSubmittingPresentation ? 'Creando…' : 'Crear'}
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
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {presentationId && (
                  <SelectItem value="__clear__" className="text-muted-foreground cursor-pointer">
                    ✕ Sin presentación
                  </SelectItem>
                )}
                {presentations.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Sin presentaciones
                  </SelectItem>
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

        <div className="space-y-2">
          <Label>Código</Label>
          <Input
            placeholder="Código de variante"
            className="bg-muted font-mono text-sm font-medium tracking-wide placeholder:text-muted-foreground/50"
            {...control.register(`variants.${index}.code`)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Stock *</Label>
          <Input
            type="number"
            placeholder="0"
            {...control.register(`variants.${index}.stock`, { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Stock mínimo</Label>
          <Input
            type="number"
            min={0}
            placeholder="0"
            {...control.register(`variants.${index}.minimumStock`, { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Precio de costo *</Label>
          <PriceInput value={costPrice} onChange={(val) => setValue(`variants.${index}.costPrice`, val)} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Margen de ganancia (%)</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            placeholder="0"
            {...control.register(`variants.${index}.profitMargin`, { valueAsNumber: true })}
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label className="text-muted-foreground">Precio sugerido de venta</Label>
          <div className="flex h-9 items-center rounded-md bg-muted/50 px-3 text-sm font-medium tabular-nums">
            {suggestedPrice !== null
              ? `$ ${suggestedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
