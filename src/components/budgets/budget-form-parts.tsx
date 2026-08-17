'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Minus, PackageSearch, Plus, Trash2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';

import type { SaleClientOption, SaleVariantOption } from '@/app/services/sales';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PriceInput } from '@/components/ui/price-input';
import { QuantityInput } from '@/components/ui/quantity-input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { BudgetValues } from '@/schemas/budgets/budget-schema';

type BudgetItemValues = BudgetValues['items'][number];

function formatTotal(value: number): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatItemName(variant: SaleVariantOption | undefined): string {
  if (!variant) return 'Producto no seleccionado';
  return [variant.brandName, variant.productName, variant.presentationLabel].filter(Boolean).join(' · ');
}

function useFirstItemsErrorMessage(errors: FieldErrors<BudgetValues>['items']): string | undefined {
  return useMemo(() => {
    if (!errors) return undefined;
    if (errors.root?.message) return errors.root.message;
    if (Array.isArray(errors)) {
      for (const row of errors) {
        const message = row?.variantId?.message ?? row?.quantity?.message ?? row?.unitPrice?.message;
        if (message) return message;
      }
    }
    return undefined;
  }, [errors]);
}

interface EmptyProductsStateProps {
  onAdd: () => void;
  disabled?: boolean;
}

function EmptyProductsState({ onAdd, disabled }: EmptyProductsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <div className="mb-3 rounded-full bg-background p-3 shadow-sm">
        <PackageSearch className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">Agregá al menos un producto</p>
      <p className="mt-1 text-xs text-muted-foreground">Buscá entre los productos disponibles y cargá la cantidad.</p>
      <Button type="button" size="sm" onClick={onAdd} disabled={disabled} className="mt-4">
        <Plus className="h-4 w-4" />
        Agregar producto
      </Button>
    </div>
  );
}

function StepperInput({
  value,
  onChange,
  onBlur,
  min = 1,
  max,
  disabled,
  className,
  size = 'default',
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const inputHeight = size === 'sm' ? 'h-8' : 'h-10';

  return (
    <div
      className={cn(
        'flex items-stretch rounded-xl has-[input:focus-visible]:ring-ring/50 has-[input:focus-visible]:ring-[3px]',
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={!canDecrease}
        className={cn('rounded-r-none border-r-0', buttonSize)}
      >
        <Minus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </Button>
      <QuantityInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        max={max}
        min={min}
        disabled={disabled}
        placeholder=""
        className={cn(
          'rounded-none border-x-0 text-center focus-visible:border-input focus-visible:ring-0',
          inputHeight,
        )}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(max === undefined ? value + 1 : Math.min(max, value + 1))}
        disabled={!canIncrease}
        className={cn('rounded-l-none border-l-0', buttonSize)}
      >
        <Plus className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </Button>
    </div>
  );
}

interface ProductCardProps {
  index: number;
  variants: SaleVariantOption[];
  form: UseFormReturn<BudgetValues>;
  onRemove: () => void;
}

function ProductCard({ index, variants, form, onRemove }: ProductCardProps) {
  const variantId = form.watch(`items.${index}.variantId`);
  const quantity = form.watch(`items.${index}.quantity`);
  const unitPrice = form.watch(`items.${index}.unitPrice`);
  const selectedVariant = variants.find((v) => v.variantId === variantId);
  const subtotal = (quantity || 0) * (unitPrice || 0);

  return (
    <Card className="shrink-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">{formatItemName(selectedVariant)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-1">
                <FormLabel className="text-xs">Cantidad</FormLabel>
                <FormControl>
                  <StepperInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    min={1}
                    disabled={!variantId}
                    size="sm"
                    className={cn(fieldState.error && '[&_input]:border-destructive')}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.unitPrice`}
            render={({ field, fieldState }) => (
              <FormItem className="flex flex-col gap-1">
                <FormLabel className="text-xs">Precio unitario</FormLabel>
                <FormControl>
                  <PriceInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    className={cn('h-8', fieldState.error && 'border-destructive')}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
          <span className="text-xs text-muted-foreground">Subtotal</span>
          <span className="text-base font-semibold text-primary">$ {formatTotal(subtotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface AddProductSheetProps {
  open: boolean;
  onClose: () => void;
  variants: SaleVariantOption[];
  onAdd: (item: BudgetItemValues) => void;
}

function AddProductSheet({ open, onClose, variants, onAdd }: AddProductSheetProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  const selectedVariant = variants.find((v) => String(v.variantId) === selectedVariantId);
  const canAdd = selectedVariant && quantity > 0 && unitPrice >= 0;
  const subtotal = (Number.isFinite(quantity) ? quantity : 0) * unitPrice;

  const productOptions = useMemo(
    () =>
      variants.map((v) => ({
        value: String(v.variantId),
        label: [v.brandName, v.productName, v.presentationLabel].filter(Boolean).join(' · '),
      })),
    [variants],
  );

  const handleProductSelect = (value: string) => {
    setSelectedVariantId(value);
    const variant = variants.find((v) => String(v.variantId) === value);
    if (variant) {
      setUnitPrice(variant.price);
      setQuantity(1);
    }
  };

  const handleAdd = () => {
    if (!selectedVariant || !canAdd) return;
    onAdd({
      variantId: selectedVariant.variantId,
      quantity,
      unitPrice,
    });
    onClose();
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Agregar producto</ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="flex flex-col gap-4">
        <Combobox
          options={productOptions}
          value={selectedVariantId ?? ''}
          onValueChange={handleProductSelect}
          placeholder=""
          searchPlaceholder=""
          emptyMessage=""
        />

        {selectedVariant && (
          <div className="rounded-xl bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">{formatItemName(selectedVariant)}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cantidad</Label>
            <StepperInput value={quantity} onChange={setQuantity} min={1} disabled={!selectedVariant} size="sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Precio unitario</Label>
            <PriceInput value={unitPrice} onChange={setUnitPrice} className="h-8" />
          </div>
        </div>

        {selectedVariant && (
          <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
            <span className="text-xs text-muted-foreground">Subtotal</span>
            <span className="text-lg font-bold text-primary">$ {formatTotal(subtotal)}</span>
          </div>
        )}
      </ResponsiveModalBody>

      <ResponsiveModalFooter className="flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onClose} className="sm:flex-1">
          Cancelar
        </Button>
        <Button type="button" onClick={handleAdd} disabled={!canAdd} className="sm:flex-1">
          Agregar
        </Button>
      </ResponsiveModalFooter>
    </ResponsiveModal>
  );
}

interface ClientFieldProps {
  form: UseFormReturn<BudgetValues>;
  clients: SaleClientOption[];
  onNewClient: () => void;
  onClientChange?: (value: string) => void;
}

function ClientField({ form, clients, onNewClient, onClientChange }: ClientFieldProps) {
  return (
    <FormField
      control={form.control}
      name="clientId"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>Cliente</FormLabel>
            <Button type="button" variant="link" size="xs" onClick={onNewClient} className="gap-1 px-0">
              <UserPlus className="h-3.5 w-3.5" />
              Nuevo cliente
            </Button>
          </div>
          <FormControl>
            <Combobox
              options={clients.map((c) => ({
                value: String(c.id),
                label: c.name,
              }))}
              value={field.value ? String(field.value) : ''}
              onValueChange={onClientChange ?? ((v) => field.onChange(v ? Number(v) : undefined))}
              placeholder=""
              searchPlaceholder=""
              emptyMessage=""
            />
          </FormControl>
          <div className="min-h-5">
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

interface ValidUntilFieldProps {
  value?: string;
  onChange: (value: string) => void;
}

function ValidUntilField({ value, onChange }: ValidUntilFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="h-4 w-4" />
          {value
            ? format(new Date(`${value}T12:00:00`), "d 'de' MMMM 'de' yyyy", {
                locale: es,
              })
            : 'Sin vencimiento'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? new Date(`${value}T12:00:00`) : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          locale={es}
          showOutsideDays={false}
          formatters={{
            formatWeekdayName: (date) => format(date, 'EEEEE', { locale: es }).toUpperCase(),
            formatCaption: (month, options) => {
              const str = format(month, 'LLLL yyyy', {
                locale: options?.locale ?? es,
              });
              return str.charAt(0).toUpperCase() + str.slice(1);
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DetailsTabProps {
  form: UseFormReturn<BudgetValues>;
  clients: SaleClientOption[];
  onNewClient: () => void;
  onClientChange?: (value: string) => void;
  canUseRecipientPhone?: boolean;
  selectedClientPhone?: string;
}

function DetailsTab({
  form,
  clients,
  onNewClient,
  onClientChange,
  canUseRecipientPhone = false,
  selectedClientPhone,
}: DetailsTabProps) {
  const watchedClientPhone = form.watch('clientPhone');
  const phoneWasEdited =
    watchedClientPhone !== undefined && watchedClientPhone !== '' && watchedClientPhone !== selectedClientPhone;

  return (
    <div className="flex flex-col gap-4 sm:flex-1 sm:min-h-0 sm:overflow-y-auto sm:px-2">
      <ClientField form={form} clients={clients} onNewClient={onNewClient} onClientChange={onClientChange} />

      {canUseRecipientPhone && (
        <>
          <FormField
            control={form.control}
            name="clientPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono del cliente</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} type="tel" />
                </FormControl>
                <div className="min-h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {phoneWasEdited && (
            <FormField
              control={form.control}
              name="saveClientPhone"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Guardar teléfono en el cliente</FormLabel>
                </FormItem>
              )}
            />
          )}
        </>
      )}

      <FormField
        control={form.control}
        name="validUntil"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Válido hasta</FormLabel>
            <ValidUntilField value={field.value} onChange={field.onChange} />
            <div className="min-h-5">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} placeholder="" rows={2} maxLength={500} />
            </FormControl>
            <div className="flex min-h-5 items-start gap-2">
              <FormMessage />
              <span className="ml-auto text-xs text-muted-foreground">{(field.value ?? '').length}/500</span>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}

interface ProductsTabProps {
  form: UseFormReturn<BudgetValues>;
  fields: { id: string }[];
  remove: (index: number) => void;
  variants: SaleVariantOption[];
  onAddProduct: () => void;
  itemError?: string;
}

function ProductsTab({ form, fields, remove, variants, onAddProduct, itemError }: ProductsTabProps) {
  const items = form.watch('items');
  const itemCount = items?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-1 sm:min-h-0 sm:overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 sm:px-2">
        <h3 className="text-sm font-medium text-muted-foreground">Lista de productos</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddProduct}
          disabled={variants.length === 0}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {itemCount === 0 ? (
        <div className="flex flex-col items-center justify-center sm:flex-1 sm:min-h-0">
          <EmptyProductsState onAdd={onAddProduct} disabled={variants.length === 0} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-1 sm:min-h-0 sm:overflow-y-auto sm:p-2">
          {fields.map((field, index) => (
            <ProductCard key={field.id} index={index} variants={variants} form={form} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      {itemError && <p className="text-sm text-destructive">{itemError}</p>}
    </div>
  );
}

interface BudgetFooterProps {
  total: number;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
  loadingLabel?: string;
  isEditing?: boolean;
}

function BudgetFooter({
  total,
  isSubmitting,
  onCancel,
  submitLabel,
  loadingLabel = 'Guardando',
  isEditing = false,
}: BudgetFooterProps) {
  const buttonText = isSubmitting ? (
    <span className="flex items-center gap-2">
      {isEditing ? loadingLabel : 'Creando'}
      <Spinner />
    </span>
  ) : (
    submitLabel
  );

  return (
    <div className="flex flex-col gap-3 border-t p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xl font-bold text-primary">$ {formatTotal(total)}</span>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

interface BudgetFormSkeletonProps {
  isMobile: boolean;
}

function BudgetFormSkeleton({ isMobile }: BudgetFormSkeletonProps) {
  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      {isMobile && <Skeleton className="h-9 w-full rounded-lg" />}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="mt-auto">
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

export {
  AddProductSheet,
  BudgetFooter,
  BudgetFormSkeleton,
  DetailsTab,
  EmptyProductsState,
  formatTotal,
  ProductCard,
  ProductsTab,
  useFirstItemsErrorMessage,
};
export type { BudgetItemValues };
