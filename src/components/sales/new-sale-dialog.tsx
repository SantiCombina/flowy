'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Trash2, XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import type { SaleClientOption, SaleVariantOption } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/ui/price-input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Client } from '@/payload-types';
import { saleSchema, type SaleValues } from '@/schemas/sales/sale-schema';

import { useUser } from '@/components/providers/user-provider';

import { getClientsForSaleAction } from '../clients/actions';

import { createSaleAction, getSaleOptionsAction, getSaleOptionsAsOwnerAction } from './actions';

interface NewSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'credit', label: 'A crédito' },
] as const;

function ItemRow({
  index,
  variants,
  onRemove,
  form,
}: {
  index: number;
  variants: SaleVariantOption[];
  onRemove: () => void;
  form: ReturnType<typeof useForm<SaleValues>>;
}) {
  const { control, setValue, watch } = form;
  const variantId = watch(`items.${index}.variantId`);
  const stockSource = watch(`items.${index}.stockSource`);
  const quantity = watch(`items.${index}.quantity`);
  const selectedVariant = variants.find((v) => v.variantId === variantId);

  const warehouseStock = selectedVariant?.warehouseStock ?? 0;
  const personalStock = selectedVariant?.personalStock ?? 0;
  const availableStock = stockSource === 'personal' ? personalStock : warehouseStock;

  const handleVariantChange = (value: string) => {
    const id = Number(value);
    setValue(`items.${index}.variantId`, id);
    setValue(`items.${index}.quantity`, 1);

    const variant = variants.find((v) => v.variantId === id);
    if (variant) {
      setValue(`items.${index}.unitPrice`, variant.price);

      if (variant.warehouseStock > 0) {
        setValue(`items.${index}.stockSource`, 'warehouse');
      } else if (variant.personalStock > 0) {
        setValue(`items.${index}.stockSource`, 'personal');
      }
    }
  };

  const handleStockSourceChange = (v: string) => {
    const source = v as 'warehouse' | 'personal';
    const newMax = source === 'personal' ? personalStock : warehouseStock;
    setValue(`items.${index}.stockSource`, source);
    if (quantity > newMax) {
      setValue(`items.${index}.quantity`, newMax);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_80px_110px_140px_32px] sm:gap-2 sm:items-start">
      <div className="flex gap-2 sm:contents">
        <Controller
          control={control}
          name={`items.${index}.variantId`}
          render={({ field, fieldState }) => (
            <div className="min-w-0 flex-1 sm:flex-none">
              <Combobox
                options={variants.map((v) => {
                  const totalStock = v.warehouseStock + v.personalStock;
                  const parts = [
                    v.brandName ?? null,
                    v.productName,
                    v.presentationLabel ?? null,
                    totalStock === 0 ? '(sin stock)' : null,
                  ].filter(Boolean);
                  return {
                    value: String(v.variantId),
                    label: parts.join(' · '),
                    disabled: totalStock === 0,
                  };
                })}
                value={field.value ? String(field.value) : ''}
                onValueChange={handleVariantChange}
                placeholder="Producto..."
                searchPlaceholder="Buscar por nombre o marca..."
                emptyMessage="No se encontró el producto."
                className={cn(fieldState.error && 'border-destructive')}
              />
              {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-9 w-8 text-muted-foreground hover:text-destructive shrink-0 sm:order-last"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:contents">
        <Controller
          control={control}
          name={`items.${index}.quantity`}
          render={({ field, fieldState }) => (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Cant.</p>
              <Input
                type="number"
                min={1}
                max={availableStock || undefined}
                step={1}
                placeholder="1"
                value={field.value || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  field.onChange(availableStock ? Math.min(val, availableStock) : val);
                }}
                className={fieldState.error ? 'border-destructive' : ''}
                disabled={!variantId || availableStock === 0}
              />
              {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field, fieldState }) => (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Precio</p>
              <PriceInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                className={fieldState.error ? 'border-destructive' : ''}
              />
              {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
            </div>
          )}
        />

        <Controller
          control={control}
          name={`items.${index}.stockSource`}
          render={({ field, fieldState }) => (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Origen</p>
              <Select value={field.value} onValueChange={handleStockSourceChange} disabled={!variantId}>
                <SelectTrigger className={fieldState.error ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Origen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse" disabled={warehouseStock === 0}>
                    Depósito ({warehouseStock})
                  </SelectItem>
                  <SelectItem value="personal" disabled={personalStock === 0}>
                    Mi inventario ({personalStock})
                  </SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error && <p className="text-xs text-destructive mt-1">{fieldState.error.message}</p>}
            </div>
          )}
        />
      </div>
    </div>
  );
}

export function NewSaleDialog({ isOpen, onClose, onSuccess }: NewSaleDialogProps) {
  const user = useUser();
  const isOwner = user?.role === 'owner';

  const {
    executeAsync: fetchSellerOptions,
    isExecuting: isLoadingSellerOptions,
    result: sellerOptionsResult,
  } = useAction(getSaleOptionsAction);

  const {
    executeAsync: fetchOwnerOptions,
    isExecuting: isLoadingOwnerOptions,
    result: ownerOptionsResult,
  } = useAction(getSaleOptionsAsOwnerAction);

  const fetchOptions = isOwner ? fetchOwnerOptions : fetchSellerOptions;
  const isLoadingOptions = isOwner ? isLoadingOwnerOptions : isLoadingSellerOptions;
  const optionsResult = isOwner ? ownerOptionsResult : sellerOptionsResult;
  const { executeAsync: submitSale, isExecuting: isSubmitting } = useAction(createSaleAction);
  const { executeAsync: fetchClients } = useAction(getClientsForSaleAction);
  const [showSuccess, setShowSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientsOverride, setClientsOverride] = useState<SaleClientOption[] | null>(null);

  const variants: SaleVariantOption[] = optionsResult?.data?.variants ?? [];
  const localClients: SaleClientOption[] = clientsOverride ?? optionsResult?.data?.clients ?? [];

  const form = useForm<SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      paymentMethod: 'credit',
      items: [{ variantId: 0, quantity: 1, unitPrice: 0, stockSource: 'warehouse' }],
      immediateDelivery: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const hasUnselectedVariant = (watchedItems ?? []).some((item) => !item.variantId || item.variantId === 0);

  useEffect(() => {
    if (!isOpen) return;
    void fetchOptions();
  }, [isOpen]);

  const handleClose = () => {
    setClientsOverride(null);
    setShowSuccess(false);
    setServerError(null);
    onClose();
  };

  const handleNewClientSuccess = async (newClient: Client) => {
    const result = await fetchClients();
    if (result?.data?.clients) {
      setClientsOverride(result.data.clients);
    } else {
      setClientsOverride([...localClients, { id: newClient.id, name: newClient.name }]);
    }
    form.setValue('clientId', newClient.id);
    setIsClientModalOpen(false);
  };

  const onSubmit = async (data: SaleValues) => {
    setServerError(null);
    const result = await submitSale(data);

    if (result?.serverError) {
      setServerError(result.serverError);
      return;
    }

    if (result?.data?.success) {
      setShowSuccess(true);
      onSuccess();
      setTimeout(onClose, 2000);
    }
  };

  const formatTotal = (value: number) =>
    value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
      <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-3xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Registrar venta</ResponsiveModalTitle>
          <ResponsiveModalDescription>Completá los datos de la venta para registrarla.</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {showSuccess ? (
          <ResponsiveModalBody className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">¡Venta registrada!</h3>
              <p className="text-sm text-muted-foreground">La venta fue guardada correctamente.</p>
            </div>
          </ResponsiveModalBody>
        ) : isLoadingOptions ? (
          <ResponsiveModalBody className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">Cargando productos…</p>
          </ResponsiveModalBody>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <ResponsiveModalBody className="flex flex-col gap-3">
                <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_80px_110px_140px_32px] gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Producto</p>
                  <p className="text-xs font-medium text-muted-foreground">Cant.</p>
                  <p className="text-xs font-medium text-muted-foreground">Precio unit.</p>
                  <p className="text-xs font-medium text-muted-foreground">Origen</p>
                  <div />
                </div>

                {fields.map((field, index) => (
                  <ItemRow
                    key={field.id}
                    index={index}
                    variants={variants}
                    onRemove={() => remove(index)}
                    form={form}
                  />
                ))}

                {form.formState.errors.items?.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => append({ variantId: 0, quantity: 1, unitPrice: 0, stockSource: 'warehouse' })}
                  disabled={variants.length === 0 || hasUnselectedVariant}
                >
                  + Agregar producto
                </Button>

                <div className="pt-2 border-t space-y-3">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Cliente</FormLabel>
                          <button
                            type="button"
                            onClick={() => setIsClientModalOpen(true)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            + Nuevo cliente
                          </button>
                        </div>
                        <FormControl>
                          <Combobox
                            options={localClients.map((c) => ({ value: String(c.id), label: c.name }))}
                            value={field.value ? String(field.value) : ''}
                            onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                            placeholder="Sin cliente"
                            searchPlaceholder="Buscar cliente..."
                            emptyMessage="No se encontró el cliente."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cobro</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            if (v !== 'check') form.setValue('checkDueDate', undefined);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PAYMENT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
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
                          <FormControl>
                            <input
                              type="date"
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              min={new Date().toISOString().split('T')[0]}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Observaciones..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="immediateDelivery"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Entrega inmediata</FormLabel>
                    </FormItem>
                  )}
                />

                {serverError && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}
              </ResponsiveModalBody>

              <ResponsiveModalFooter className="justify-between">
                <p className="text-base font-semibold">
                  Total: <span className="text-primary">$ {formatTotal(total)}</span>
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || variants.length === 0 || hasUnselectedVariant}>
                    {isSubmitting ? 'Registrando…' : 'Registrar venta'}
                  </Button>
                </div>
              </ResponsiveModalFooter>
            </form>
          </Form>
        )}
      </ResponsiveModal>

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={handleNewClientSuccess}
      />
    </>
  );
}
