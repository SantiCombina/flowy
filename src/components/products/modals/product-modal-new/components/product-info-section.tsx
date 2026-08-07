'use client';

import { useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ProductFormData } from '@/schemas/products/product-schema';

import { ImageUpload } from './image-upload';

interface ProductInfoSectionProps {
  pendingImageFile: File | undefined;
  currentImageUrl: string | undefined;
  onFileSelect: (file: File | undefined) => void;
}

export function ProductInfoSection({ pendingImageFile, currentImageUrl, onFileSelect }: ProductInfoSectionProps) {
  const { control } = useFormContext<ProductFormData>();

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-2 border-b">
        Información general
      </h3>

      <div className="space-y-1.5">
        <FormLabel>Imagen del producto</FormLabel>
        <ImageUpload pendingFile={pendingImageFile} previewUrl={currentImageUrl} onFileSelect={onFileSelect} />
      </div>

      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Nombre <span className="text-sky">*</span>
            </FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <div className="min-h-5">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea {...field} rows={3} maxLength={500} />
            </FormControl>
            <div className="min-h-5">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-xl bg-white p-3 shadow-sm transition-all duration-200">
            <FormLabel className="cursor-pointer font-normal">Producto activo</FormLabel>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
