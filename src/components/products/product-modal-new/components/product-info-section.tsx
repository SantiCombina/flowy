'use client';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

interface ProductInfoSectionProps {
  register: UseFormRegister<ProductFormData>;
  control: Control<ProductFormData>;
  errors: FieldErrors<ProductFormData>;
}

export function ProductInfoSection({ register, control, errors }: ProductInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Información general</h3>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" {...register('name')} placeholder="Ej: Alimento Premium Perro" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Descripción del producto..."
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">Máximo 500 caracteres</p>
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          name="isActive"
          control={control}
          render={({ field }) => <Checkbox checked={field.value} onCheckedChange={field.onChange} id="isActive" />}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Producto activo
        </Label>
      </div>
    </div>
  );
}
