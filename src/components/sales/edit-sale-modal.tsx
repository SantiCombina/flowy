'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { SaleItemDetail, SaleOptions, SaleRow, SaleVariantOption } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { Button } from '@/components/ui/button';
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
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { Client } from '@/payload-types';
import type { ClientValues } from '@/schemas/clients/client-schema';
import { editSaleFullSchema, type EditSaleFullValues } from '@/schemas/sales/edit-sale-full-schema';
import type { SaleValues } from '@/schemas/sales/sale-schema';

import { createClientAction, getClientsForSaleAction } from '../clients/actions';

import {
  editSaleFullAction,
  getClientsForOwnerAction,
  getSaleOptionsAction,
  getSaleOptionsForOwnerAction,
} from './actions';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleRow;
  isSeller: boolean;
  initialOptions: SaleOptions | null;
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
  variantName,
  onRemove,
  form,
}: {
  index: number;
  variants: SaleVariantOption[];
  variantName?: string;
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
    if (quantity > newMax) setValue(`items.${index}.quantity`, newMax);
  };

  const isLoadingVariants = variants.length === 0;

  return (
    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_80px_110px_140px_32px] sm:gap-2 sm:items-start">
      <div className="flex gap-2 sm:contents">
        {isLoadingVariants && variantName ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-none rounded-md border border-dashed bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium truncate">{variantName}</span>
            <span className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" />
          </div>
        ) : (
          <FormField
            control={control}
            name={`items.${index}.variantId`}
            render={({ field, fieldState }) => (
              <FormItem className="min-w-0 flex-1 sm:flex-none">
                <FormControl>
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0 sm:order-last"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:contents">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field, fieldState }) => (
            <FormItem>
              <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Cant.</p>
              <FormControl>
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field, fieldState }) => (
            <FormItem>
              <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Precio</p>
              <FormControl>
                <PriceInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  className={fieldState.error ? 'border-destructive' : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`items.${index}.stockSource`}
          render={({ field, fieldState }) => (
            <FormItem>
              <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Origen</p>
              <FormControl>
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
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export function EditSaleModal({ isOpen, onClose, sale, isSeller, initialOptions }: EditSaleModalProps) {
  const queryClient = useQueryClient();

  const { data: fetchedOptions } = useServerActionQuery({
    queryKey: queryKeys.sales.options(isSeller ? 'seller' : 'owner', sale.sellerId),
    queryFn: () => (isSeller ? getSaleOptionsAction() : getSaleOptionsForOwnerAction({ sellerId: sale.sellerId })),
    enabled: initialOptions === null && isOpen,
    staleTime: 60_000,
  });

  const variants = initialOptions?.variants ?? fetchedOptions?.variants ?? [];
  const clients = initialOptions?.clients ?? fetchedOptions?.clients ?? [];

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientsOverride, setClientsOverride] = useState<{ id: number; name: string }[] | null>(null);

  const localClients = clientsOverride ?? clients;

  const currentPaymentMethod = sale.paymentMethod ?? 'credit';

  const form = useForm<EditSaleFullValues>({
    resolver: zodResolver(editSaleFullSchema),
    defaultValues: {
      saleId: sale.id,
      paymentMethod: currentPaymentMethod,
      items: sale.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        stockSource: item.stockSource,
      })),
      clientId: sale.clientId ?? undefined,
      notes: sale.notes ?? '',
      checkDueDate: sale.checkDueDate ?? undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const hasUnselectedVariant = (watchedItems ?? []).some((item) => !item.variantId || item.variantId === 0);

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      saleId: sale.id,
      paymentMethod: sale.paymentMethod ?? 'credit',
      items: sale.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        stockSource: item.stockSource,
      })),
      clientId: sale.clientId ?? undefined,
      notes: sale.notes ?? '',
      checkDueDate: sale.checkDueDate ?? undefined,
    });
  }, [isOpen, sale.id, form]);

  const handleClose = () => {
    setClientsOverride(null);
    onClose();
  };

  const handleNewClientSuccess = async (data: ClientValues) => {
    const createResult = await createClientAction(data);

    if (createResult?.serverError) {
      toast.error(createResult.serverError);
      return;
    }

    if (createResult?.data?.success && createResult.data.client) {
      const newClient = createResult.data.client as Client;

      if (isSeller) {
        const refreshResult = await getClientsForSaleAction();
        if (refreshResult?.data?.success && refreshResult.data.clients) {
          setClientsOverride(refreshResult.data.clients);
        } else {
          setClientsOverride([...localClients, { id: newClient.id, name: newClient.name }]);
        }
      } else {
        const refreshResult = await getClientsForOwnerAction();
        if (refreshResult?.data?.success && refreshResult.data.clients) {
          setClientsOverride(refreshResult.data.clients);
        } else {
          setClientsOverride([...localClients, { id: newClient.id, name: newClient.name }]);
        }
      }

      form.setValue('clientId', newClient.id);
    }

    setIsClientModalOpen(false);
  };

  const onSubmit = useCallback(
    async (data: EditSaleFullValues) => {
      const newItems: SaleItemDetail[] = data.items.map((item) => {
        const variant = variants.find((v) => v.variantId === item.variantId);
        const brandPart = variant?.brandName ? ` · ${variant.brandName}` : '';
        const presentationPart = variant?.presentationLabel ? ` · ${variant.presentationLabel}` : '';
        return {
          variantId: item.variantId,
          variantName: variant ? `${variant.productName}${brandPart}${presentationPart}` : 'Producto',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
          stockSource: item.stockSource,
        };
      });

      const newTotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);

      const newClient = data.clientId ? localClients.find((c) => c.id === data.clientId) : undefined;
      const newClientName = newClient?.name;

      const previousData: { queryKey: readonly unknown[]; data: unknown }[] = [];
      queryClient.getQueriesData({ queryKey: ['sales'] }).forEach(([queryKey, qData]) => {
        previousData.push({ queryKey, data: qData });
      });

      queryClient.setQueriesData({ queryKey: ['sales'] }, (old: unknown) => {
        if (!old || typeof old !== 'object' || !('sales' in (old as Record<string, unknown>))) return old;
        const existing = old as { success: boolean; sales: SaleRow[] };
        return {
          ...existing,
          sales: existing.sales.map((s) => {
            if (s.id !== data.saleId) return s;
            const newPaymentStatus =
              s.amountPaid >= newTotal ? 'collected' : s.amountPaid > 0 ? 'partially_collected' : 'pending';
            const newOwnerPaymentStatus =
              s.ownerAmountPaid >= newTotal ? 'collected' : s.ownerAmountPaid > 0 ? 'partially_collected' : 'pending';
            return {
              ...s,
              items: newItems,
              itemCount: newItems.length,
              total: newTotal,
              clientId: data.clientId ?? undefined,
              clientName: data.clientId ? (newClientName ?? s.clientName) : undefined,
              paymentMethod:
                data.paymentMethod === 'credit' ? null : (data.paymentMethod as 'cash' | 'transfer' | 'check'),
              paymentStatus: newPaymentStatus,
              ownerPaymentStatus: newOwnerPaymentStatus,
              checkDueDate: data.checkDueDate ?? null,
              notes: data.notes || null,
            };
          }),
        };
      });

      onClose();

      const result = await editSaleFullAction(data);

      if (result?.serverError || result?.validationErrors) {
        for (const { queryKey, data: prevData } of previousData) {
          if (prevData) queryClient.setQueryData(queryKey, prevData);
        }
        toast.error(result?.serverError ?? 'Error de validación');
        return;
      }

      if (result?.data?.success) {
        toast.success('Venta actualizada');
      }
    },
    [queryClient, variants, onClose, localClients],
  );

  const formatTotal = (value: number) =>
    value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleFormSubmit = form.handleSubmit(onSubmit);

  return (
    <>
      <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-3xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Editar venta</ResponsiveModalTitle>
          <ResponsiveModalDescription>Modificá los datos de la venta.</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
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
                  variantName={sale.items[index]?.variantName}
                  onRemove={() => remove(index)}
                  form={form as unknown as ReturnType<typeof useForm<SaleValues>>}
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
                          onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                          onClear={() => field.onChange(null)}
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
                            className="flex h-9 w-full rounded-md bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
            </ResponsiveModalBody>

            <ResponsiveModalFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-base font-semibold">
                Total: <span className="text-primary">$ {formatTotal(total)}</span>
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={variants.length === 0 || hasUnselectedVariant}>
                  Actualizar venta
                </Button>
              </div>
            </ResponsiveModalFooter>
          </form>
        </Form>
      </ResponsiveModal>

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onCreate={handleNewClientSuccess}
      />
    </>
  );
}
