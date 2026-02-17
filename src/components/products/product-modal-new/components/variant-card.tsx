'use client';

import { Trash2, X } from 'lucide-react';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    minStock: number;
    price: number;
  }>;
}

interface ExtendedVariantCardProps extends VariantCardProps {
  register: UseFormRegister<ProductFormData>;
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

export function VariantCard({
  index,
  canDelete,
  onDelete,
  presentations,
  onCreatePresentation,
  onDeletePresentation,
  register,
  control,
  errors,
}: ExtendedVariantCardProps) {
  return (
    <div className="relative border rounded-lg p-4 bg-muted/30 space-y-3">
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

      <div className="grid grid-cols-2 gap-4 pr-10">
        <div className="space-y-2">
          <Label>Presentación</Label>
          <Controller
            name={`variants.${index}.presentationId`}
            control={control}
            render={({ field }) => {
              const handleValueChange = (newValue: string) => {
                if (newValue === '__create__') {
                  onCreatePresentation();
                  return;
                }
                if (newValue === '__clear__') {
                  field.onChange('');
                  return;
                }
                field.onChange(newValue);
              };

              const handleDeleteClick = (e: React.MouseEvent, presId: number, presLabel: string) => {
                e.preventDefault();
                e.stopPropagation();
                onDeletePresentation(presId, presLabel);
              };

              return (
                <Select onValueChange={handleValueChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__create__" className="text-primary font-medium cursor-pointer">
                      + Crear nueva presentación
                    </SelectItem>
                    {field.value && (
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
                        <SelectItem key={pres.id} value={pres.id.toString()} className="pr-16">
                          <SelectItemText>{pres.label}</SelectItemText>
                          <button
                            type="button"
                            onMouseDown={(e) => handleDeleteClick(e, pres.id, pres.label)}
                            className="absolute right-8 p-1 rounded hover:bg-destructive/10 text-destructive transition-colors z-10"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              );
            }}
          />
          {errors.variants?.[index]?.presentationId && (
            <p className="text-xs text-destructive">{errors.variants[index]?.presentationId?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Código</Label>
          <Input
            {...register(`variants.${index}.code`)}
            placeholder="Código de variante"
            className="bg-muted border-muted-foreground/30 font-mono text-sm font-medium tracking-wide placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Stock *</Label>
          <Input
            type="number"
            {...register(`variants.${index}.stock`, {
              setValueAs: (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? 0 : num;
              },
            })}
            placeholder="0"
            defaultValue={0}
          />
          {errors.variants?.[index]?.stock && (
            <p className="text-xs text-destructive">{errors.variants[index]?.stock?.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Stock mínimo</Label>
          <Input
            type="number"
            {...register(`variants.${index}.minStock`, {
              setValueAs: (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? 0 : num;
              },
            })}
            placeholder="0"
            defaultValue={0}
          />
        </div>

        <div className="space-y-2">
          <Label>Precio *</Label>
          <Input
            type="number"
            step="0.01"
            {...register(`variants.${index}.price`, {
              setValueAs: (value) => {
                const num = parseFloat(value);
                return isNaN(num) ? 0 : num;
              },
            })}
            placeholder="0.00"
          />
          {errors.variants?.[index]?.price && (
            <p className="text-xs text-destructive">{errors.variants[index]?.price?.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
