'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRightLeft,
  Banknote,
  CalendarIcon,
  CheckIcon,
  CreditCard,
  FileText,
  Minus,
  PackageSearch,
  Plus,
  Store,
  Trash2,
  User,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { type FieldErrors, type UseFormReturn } from 'react-hook-form';

import type { SaleClientOption, SaleVariantOption } from '@/app/services/sales';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PriceInput } from '@/components/ui/price-input';
import { QuantityInput } from '@/components/ui/quantity-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { type SaleValues } from '@/schemas/sales/sale-schema';

type SaleItemValues = SaleValues['items'][number];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
  { value: 'check', label: 'Cheque', icon: FileText },
  { value: 'credit', label: 'A crédito', icon: CreditCard },
] as const;

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

function useFirstItemsErrorMessage(errors: FieldErrors<SaleValues>['items']): string | undefined {
  return useMemo(() => {
    if (!errors) return undefined;
    if (errors.root?.message) return errors.root.message;
    if (Array.isArray(errors)) {
      for (const row of errors) {
        const message =
          row?.variantId?.message ?? row?.quantity?.message ?? row?.unitPrice?.message ?? row?.stockSource?.message;
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
      <Button type="button" onClick={onAdd} disabled={disabled} className="mt-4 gap-1.5">
        <Plus className="h-4 w-4" />
        Agregar producto
      </Button>
    </div>
  );
}

interface StepperInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

function StepperInput({ value, onChange, onBlur, min, max, disabled, className, size = 'default' }: StepperInputProps) {
  const minimum = min ?? 1;
  const canDecrease = !disabled && value > minimum;
  const canIncrease = !disabled && (max === undefined || value < max);
  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const inputHeight = size === 'sm' ? 'h-8' : 'h-10';

  return (
    <div className={cn('flex items-stretch', className)}>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(Math.max(minimum, value - 1))}
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
        className={cn('rounded-none border-x-0 text-center', inputHeight)}
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
  form: UseFormReturn<SaleValues>;
  onRemove: () => void;
}

function ProductCard({ index, variants, form, onRemove }: ProductCardProps) {
  const variantId = form.watch(`items.${index}.variantId`);
  const quantity = form.watch(`items.${index}.quantity`);
  const unitPrice = form.watch(`items.${index}.unitPrice`);
  const stockSource = form.watch(`items.${index}.stockSource`);
  const selectedVariant = variants.find((v) => v.variantId === variantId);
  const warehouseStock = selectedVariant?.warehouseStock ?? 0;
  const personalStock = selectedVariant?.personalStock ?? 0;
  const availableStock = stockSource === 'personal' ? personalStock : warehouseStock;
  const subtotal = (quantity || 0) * (unitPrice || 0);
  const sourceLabel = stockSource === 'personal' ? 'Mi inventario' : 'Depósito';
  const sourceStock = stockSource === 'personal' ? personalStock : warehouseStock;

  const handleStockSourceChange = (value: string) => {
    const source = value as 'warehouse' | 'personal';
    const newMax = source === 'personal' ? personalStock : warehouseStock;
    form.setValue(`items.${index}.stockSource`, source);
    if (quantity > newMax) {
      form.setValue(`items.${index}.quantity`, newMax);
    }
  };

  return (
    <Card className="shrink-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-foreground">{formatItemName(selectedVariant)}</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Store className="h-3 w-3" />
              <span>
                {sourceLabel}: {sourceStock} disponibles
              </span>
            </div>
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
                    max={availableStock || undefined}
                    min={1}
                    disabled={!variantId || availableStock === 0}
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

        <FormField
          control={form.control}
          name={`items.${index}.stockSource`}
          render={({ field, fieldState }) => (
            <FormItem className="mt-3 flex flex-col gap-1">
              <FormLabel className="text-xs">Origen del stock</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={field.value === 'warehouse' ? 'default' : 'outline'}
                    onClick={() => handleStockSourceChange('warehouse')}
                    disabled={!variantId || warehouseStock === 0}
                    className={cn('h-9 justify-start gap-2 text-xs', fieldState.error && 'border-destructive')}
                  >
                    <Store className="h-3.5 w-3.5" />
                    Depósito ({warehouseStock})
                  </Button>
                  <Button
                    type="button"
                    variant={field.value === 'personal' ? 'default' : 'outline'}
                    onClick={() => handleStockSourceChange('personal')}
                    disabled={!variantId || personalStock === 0}
                    className={cn('h-9 justify-start gap-2 text-xs', fieldState.error && 'border-destructive')}
                  >
                    <User className="h-3.5 w-3.5" />
                    Mi inventario ({personalStock})
                  </Button>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

interface AddProductSheetProps {
  open: boolean;
  onClose: () => void;
  variants: SaleVariantOption[];
  onAdd: (item: SaleItemValues) => void;
}

function AddProductSheet({ open, onClose, variants, onAdd }: AddProductSheetProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [stockSource, setStockSource] = useState<'warehouse' | 'personal'>('warehouse');
  const [unitPrice, setUnitPrice] = useState(0);

  const selectedVariant = variants.find((v) => String(v.variantId) === selectedVariantId);
  const warehouseStock = selectedVariant?.warehouseStock ?? 0;
  const personalStock = selectedVariant?.personalStock ?? 0;
  const availableStock = stockSource === 'personal' ? personalStock : warehouseStock;
  const isWarehouseEnabled = warehouseStock > 0;
  const isPersonalEnabled = personalStock > 0;
  const canAdd = selectedVariant && quantity > 0 && quantity <= availableStock;
  const subtotal = quantity * unitPrice;

  const productOptions = useMemo(
    () =>
      variants.map((v) => {
        const totalStock = v.warehouseStock + v.personalStock;
        return {
          value: String(v.variantId),
          label: [v.brandName, v.productName, v.presentationLabel, totalStock === 0 ? '(sin stock)' : null]
            .filter(Boolean)
            .join(' · '),
          disabled: totalStock === 0,
        };
      }),
    [variants],
  );

  const handleProductSelect = (value: string) => {
    setSelectedVariantId(value);
    const variant = variants.find((v) => String(v.variantId) === value);
    if (variant) {
      setUnitPrice(variant.price);
      setQuantity(1);
      if (variant.warehouseStock > 0) {
        setStockSource('warehouse');
      } else if (variant.personalStock > 0) {
        setStockSource('personal');
      }
    }
  };

  const handleStockSourceChange = (source: 'warehouse' | 'personal') => {
    const newAvailable = source === 'personal' ? personalStock : warehouseStock;
    setStockSource(source);
    if (quantity > newAvailable) {
      setQuantity(Math.max(1, newAvailable));
    }
  };

  const handleAdd = () => {
    if (!selectedVariant || !canAdd) return;
    onAdd({
      variantId: selectedVariant.variantId,
      quantity,
      unitPrice,
      stockSource,
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
          placeholder="Buscar producto..."
          searchPlaceholder="Buscar por nombre o marca..."
          emptyMessage="No se encontró el producto."
        />

        {selectedVariant && (
          <div className="rounded-xl bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">{formatItemName(selectedVariant)}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Store className="h-3.5 w-3.5" />
                Depósito: {warehouseStock}
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                Mi inventario: {personalStock}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cantidad</Label>
            <StepperInput
              value={quantity}
              onChange={setQuantity}
              max={availableStock || undefined}
              min={1}
              disabled={!selectedVariant || availableStock === 0}
              size="sm"
            />
            {selectedVariant && availableStock > 0 && (
              <p className="text-[11px] text-muted-foreground">Máximo {availableStock} unidades</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Precio unitario</Label>
            <PriceInput value={unitPrice} onChange={setUnitPrice} className="h-8" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Origen del stock</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={stockSource === 'warehouse' ? 'default' : 'outline'}
              onClick={() => handleStockSourceChange('warehouse')}
              disabled={!isWarehouseEnabled}
              className="h-9 justify-start gap-2 text-xs"
            >
              <Store className="h-3.5 w-3.5" />
              Depósito ({warehouseStock})
            </Button>
            <Button
              type="button"
              variant={stockSource === 'personal' ? 'default' : 'outline'}
              onClick={() => handleStockSourceChange('personal')}
              disabled={!isPersonalEnabled}
              className="h-9 justify-start gap-2 text-xs"
            >
              <User className="h-3.5 w-3.5" />
              Mi inventario ({personalStock})
            </Button>
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

interface PaymentMethodSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  error?: boolean;
}

function PaymentMethodSelector({ value, onChange, error }: PaymentMethodSelectorProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-2 gap-2">
      {PAYMENT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            className={cn(
              'relative flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium shadow-sm transition-all duration-200',
              isSelected
                ? 'bg-primary text-primary-foreground hover:shadow-md active:shadow-sm'
                : 'bg-white text-foreground hover:bg-accent hover:shadow-md active:shadow-sm',
              error && !isSelected && 'ring-1 ring-destructive',
            )}
          >
            <RadioGroupItem value={option.value} className="sr-only" />
            <Icon className="h-4 w-4" />
            <span>{option.label}</span>
            {isSelected && <CheckIcon className="absolute right-2 h-3.5 w-3.5" />}
          </label>
        );
      })}
    </RadioGroup>
  );
}

interface ClientFieldProps {
  form: UseFormReturn<SaleValues>;
  clients: SaleClientOption[];
  onNewClient: () => void;
}

function ClientField({ form, clients, onNewClient }: ClientFieldProps) {
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
              onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
              placeholder="Sin cliente"
              searchPlaceholder="Buscar cliente..."
              emptyMessage="No se encontró el cliente."
            />
          </FormControl>
          <div className="min-h-[20px]">
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}

interface CheckDateFieldProps {
  value?: string;
  onChange: (value: string) => void;
}

function CheckDateField({ value, onChange }: CheckDateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value
            ? format(new Date(`${value}T12:00:00`), "d 'de' MMMM 'de' yyyy", {
                locale: es,
              })
            : 'Seleccioná una fecha'}
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
  form: UseFormReturn<SaleValues>;
  clients: SaleClientOption[];
  onNewClient: () => void;
}

function DetailsTab({ form, clients, onNewClient }: DetailsTabProps) {
  const paymentMethod = form.watch('paymentMethod');

  return (
    <div className="flex flex-col gap-4 sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
      <ClientField form={form} clients={clients} onNewClient={onNewClient} />

      <FormField
        control={form.control}
        name="paymentMethod"
        render={({ field, fieldState }) => (
          <FormItem>
            <FormLabel>
              Método de pago <span className="text-sky">*</span>
            </FormLabel>
            <FormControl>
              <PaymentMethodSelector
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  if (v !== 'check') form.setValue('checkDueDate', undefined);
                }}
                error={!!fieldState.error}
              />
            </FormControl>
            <div className="min-h-[20px]">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      {paymentMethod === 'check' && (
        <FormField
          control={form.control}
          name="checkDueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de cobro del cheque</FormLabel>
              <CheckDateField value={field.value} onChange={field.onChange} />
              <div className="min-h-[20px]">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="immediateDelivery"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-xl bg-white p-3 shadow-sm transition-all duration-200">
            <FormLabel className="cursor-pointer font-normal">Entrega inmediata</FormLabel>
            <FormControl>
              <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
            </FormControl>
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
            <div className="flex min-h-[20px] items-start gap-2">
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
  form: UseFormReturn<SaleValues>;
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
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Productos agregados</h3>
          <Badge variant="secondary" className="text-xs">
            {itemCount}
          </Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddProduct}
          disabled={variants.length === 0}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Agregar producto
        </Button>
      </div>

      {itemCount === 0 ? (
        <div className="flex flex-col items-center justify-center sm:flex-1 sm:min-h-0">
          <EmptyProductsState onAdd={onAddProduct} disabled={variants.length === 0} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
          {fields.map((field, index) => (
            <ProductCard key={field.id} index={index} variants={variants} form={form} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      {itemError && (
        <div className="flex shrink-0 items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{itemError}</p>
        </div>
      )}
    </div>
  );
}

interface SaleFooterProps {
  total: number;
  isSubmitting: boolean;
  onCancel: () => void;
  submitLabel: string;
  loadingLabel?: string;
}

function SaleFooter({ total, isSubmitting, onCancel, submitLabel, loadingLabel = 'Registrando' }: SaleFooterProps) {
  return (
    <ResponsiveModalFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xl font-bold text-primary">$ {formatTotal(total)}</span>
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              {loadingLabel}
              <Spinner />
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </ResponsiveModalFooter>
  );
}

interface SaleFormSkeletonProps {
  isMobile: boolean;
}

function SaleFormSkeleton({ isMobile }: SaleFormSkeletonProps) {
  return (
    <ResponsiveModalBody className="flex flex-col gap-4">
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
    </ResponsiveModalBody>
  );
}

export {
  AddProductSheet,
  DetailsTab,
  EmptyProductsState,
  formatTotal,
  PaymentMethodSelector,
  ProductCard,
  ProductsTab,
  SaleFooter,
  SaleFormSkeleton,
  StepperInput,
  useFirstItemsErrorMessage,
};

export type { SaleItemValues };
