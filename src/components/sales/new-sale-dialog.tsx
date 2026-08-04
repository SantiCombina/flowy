'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, XCircle, Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { SaleClientOption, SaleVariantOption } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { useUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PriceInput } from '@/components/ui/price-input';
import { QuantityInput } from '@/components/ui/quantity-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/lib/query-keys';
import type { Client } from '@/payload-types';
import { saleSchema, type SaleValues } from '@/schemas/sales/sale-schema';

import { getClientsForSaleAction } from '../clients/actions';

import { createSaleAction, getSaleOptionsAction, getSaleOptionsAsOwnerAction } from './actions';
import {
  AddProductSheet,
  DetailsTab,
  ProductsTab,
  SaleFooter,
  SaleFormSkeleton,
  useFirstItemsErrorMessage,
} from './sale-form-parts';

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
  canUsePersonalStock,
}: {
  index: number;
  variants: SaleVariantOption[];
  onRemove: () => void;
  form: ReturnType<typeof useForm<SaleValues>>;
  canUsePersonalStock: boolean;
}) {
  const { control, setValue, watch } = form;
  const variantId = watch(`items.${index}.variantId`);
  const stockSource = watch(`items.${index}.stockSource`);
  const quantity = watch(`items.${index}.quantity`);
  const selectedVariant = variants.find((v) => v.variantId === variantId);

  const warehouseStock = selectedVariant?.warehouseStock ?? 0;
  const personalStock = selectedVariant?.personalStock ?? 0;
  const availableStock = stockSource === 'personal' ? personalStock : warehouseStock;

  useEffect(() => {
    if (!canUsePersonalStock && stockSource === 'personal') {
      setValue(`items.${index}.stockSource`, 'warehouse');
    }
  }, [canUsePersonalStock, stockSource, setValue, index]);

  const handleVariantChange = (value: string) => {
    const id = Number(value);
    setValue(`items.${index}.variantId`, id, { shouldValidate: true });
    setValue(`items.${index}.quantity`, 1);

    const variant = variants.find((v) => v.variantId === id);
    if (variant) {
      setValue(`items.${index}.unitPrice`, variant.price);

      if (variant.warehouseStock > 0) {
        setValue(`items.${index}.stockSource`, 'warehouse');
      } else if (canUsePersonalStock && variant.personalStock > 0) {
        setValue(`items.${index}.stockSource`, 'personal');
      } else {
        setValue(`items.${index}.stockSource`, 'warehouse');
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
        <FormField
          control={control}
          name={`items.${index}.variantId`}
          render={({ field, fieldState }) => (
            <FormItem className="min-w-0 flex-1 sm:flex-none">
              <FormControl>
                <Combobox
                  options={variants.map((v) => {
                    const totalStock = v.warehouseStock + v.personalStock;
                    const availableStockForUser = canUsePersonalStock ? totalStock : v.warehouseStock;
                    const parts = [
                      v.brandName ?? null,
                      v.productName,
                      v.presentationLabel ?? null,
                      availableStockForUser === 0 ? '(sin stock)' : null,
                    ].filter(Boolean);
                    return {
                      value: String(v.variantId),
                      label: parts.join(' · '),
                      disabled: availableStockForUser === 0,
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
              <div className="min-h-[20px]">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

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
                <QuantityInput
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  max={availableStock || undefined}
                  className={fieldState.error ? 'border-destructive' : ''}
                  disabled={!variantId || availableStock === 0}
                />
              </FormControl>
              <div className="min-h-[20px]">
                <FormMessage />
              </div>
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
              <div className="min-h-[20px]">
                <FormMessage />
              </div>
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
                    <SelectValue placeholder="" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warehouse" disabled={warehouseStock === 0}>
                      Depósito ({warehouseStock})
                    </SelectItem>
                    {canUsePersonalStock && (
                      <SelectItem value="personal" disabled={personalStock === 0}>
                        Mi inventario ({personalStock})
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <div className="min-h-[20px]">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

export function NewSaleDialog({ isOpen, onClose, onSuccess }: NewSaleDialogProps) {
  const user = useUser();
  const isOwner = user?.role === 'owner';
  const canUseCredit = user.capabilities?.includes('sale.credit') ?? isOwner;
  const canUsePersonalStock = user.capabilities?.includes('inventory.mobile') ?? isOwner;
  const isMobile = useIsMobile();

  const { data: sellerOptions, isPending: isLoadingSellerOptions } = useServerActionQuery({
    queryKey: queryKeys.sales.options('seller'),
    queryFn: () => getSaleOptionsAction(),
    enabled: isOpen && !isOwner,
    staleTime: 60_000,
  });

  const { data: ownerOptions, isPending: isLoadingOwnerOptions } = useServerActionQuery({
    queryKey: queryKeys.sales.options('owner'),
    queryFn: () => getSaleOptionsAsOwnerAction(),
    enabled: isOpen && isOwner,
    staleTime: 60_000,
  });

  const isLoadingOptions = isOwner ? isLoadingOwnerOptions : isLoadingSellerOptions;
  const optionsResult = isOwner ? ownerOptions : sellerOptions;
  const { executeAsync: submitSale, isExecuting: isSubmitting } = useAction(createSaleAction);

  const [serverError, setServerError] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientsOverride, setClientsOverride] = useState<SaleClientOption[] | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addProductKey, setAddProductKey] = useState(0);
  const [activeTab, setActiveTab] = useState('products');

  const variants = optionsResult?.variants ?? [];
  const localClients = clientsOverride ?? optionsResult?.clients ?? [];

  const form = useForm<SaleValues>({
    resolver: zodResolver(saleSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      items: [],
      immediateDelivery: false,
    },
  });

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const itemCount = watchedItems?.length ?? 0;
  const itemsError = useFirstItemsErrorMessage(form.formState.errors.items);
  const paymentMethod = form.watch('paymentMethod');

  const availablePaymentOptions = canUseCredit ? PAYMENT_OPTIONS : PAYMENT_OPTIONS.filter((o) => o.value !== 'credit');
  const hasUnselectedVariant = watchedItems?.some((item) => !item.variantId);

  useEffect(() => {
    if (!canUseCredit && paymentMethod === 'credit') {
      form.setValue('paymentMethod', 'cash');
    }
  }, [canUseCredit, paymentMethod, form]);

  const handleClose = () => {
    setClientsOverride(null);
    setServerError(null);
    setActiveTab('products');
    onClose();
  };

  const handleOpenAddProduct = () => {
    setAddProductKey((k) => k + 1);
    setIsAddProductOpen(true);
  };

  const handleNewClientSuccess = async (newClient: Client) => {
    const result = await getClientsForSaleAction();
    if (result?.data?.success && result.data.clients) {
      setClientsOverride(result.data.clients);
    } else {
      setClientsOverride([...localClients, { id: newClient.id, name: newClient.name }]);
    }
    form.setValue('clientId', newClient.id);
    setIsClientModalOpen(false);
  };

  const handleAddProduct = (item: {
    variantId: number;
    quantity: number;
    unitPrice: number;
    stockSource: 'warehouse' | 'personal';
  }) => {
    prepend(item);
  };

  const focusFirstError = useCallback(() => {
    const errors = form.formState.errors;
    if (errors.items) {
      setActiveTab('products');
      if (Array.isArray(errors.items)) {
        for (let i = 0; i < errors.items.length; i++) {
          const row = errors.items[i];
          if (row?.variantId) {
            setTimeout(() => form.setFocus(`items.${i}.variantId`), 50);
            return;
          }
          if (row?.quantity) {
            setTimeout(() => form.setFocus(`items.${i}.quantity`), 50);
            return;
          }
          if (row?.unitPrice) {
            setTimeout(() => form.setFocus(`items.${i}.unitPrice`), 50);
            return;
          }
          if (row?.stockSource) {
            setTimeout(() => form.setFocus(`items.${i}.stockSource`), 50);
            return;
          }
        }
      }
      return;
    }

    setActiveTab('details');
    const firstError = Object.keys(errors)[0] as keyof SaleValues;
    if (firstError) {
      setTimeout(() => form.setFocus(firstError), 50);
    }
  }, [form]);

  const onSubmit = useCallback(
    async (data: SaleValues) => {
      setServerError(null);
      const result = await submitSale(data);

      if (result?.serverError) {
        setServerError(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success('Venta registrada');
        onSuccess();
        onClose();
      }
    },
    [submitSale, onSuccess, onClose],
  );

  const handleFormSubmit = form.handleSubmit(onSubmit, (errors) => {
    if (errors.items) {
      setActiveTab('products');
      focusFirstError();
    } else {
      setActiveTab('details');
      focusFirstError();
    }
  });

  return (
    <>
      <ResponsiveModal
        open={isOpen}
        onOpenChange={handleClose}
        className="flex flex-col gap-0 overflow-hidden h-[100dvh] sm:max-w-5xl sm:h-[85vh]"
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Registrar venta</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        {isLoadingOptions ? (
          <SaleFormSkeleton isMobile={isMobile} />
        ) : (
          <Form {...form}>
            <form
              onSubmit={handleFormSubmit}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !(e.target instanceof HTMLButtonElement) &&
                  !(e.target instanceof HTMLTextAreaElement)
                ) {
                  e.preventDefault();
                }
              }}
              className="flex flex-1 flex-col min-h-0"
            >
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
                    canUsePersonalStock={canUsePersonalStock}
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
                  onClick={() => prepend({ variantId: 0, quantity: 1, unitPrice: 0, stockSource: 'warehouse' })}
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
                            placeholder=""
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
                            {availablePaymentOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value
                                    ? format(new Date(`${field.value}T12:00:00`), "d 'de' MMMM 'de' yyyy", {
                                        locale: es,
                                      })
                                    : 'Seleccioná una fecha'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                locale={es}
                                showOutsideDays={false}
                                formatters={{
                                  formatWeekdayName: (date) => format(date, 'EEEEE', { locale: es }).toUpperCase(),
                                  formatCaption: (month, options) => {
                                    const str = format(month, 'LLLL yyyy', { locale: options?.locale ?? es });
                                    return str.charAt(0).toUpperCase() + str.slice(1);
                                  },
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="min-h-[20px]">
                            <FormMessage />
                          </div>
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
                        <Textarea {...field} placeholder="" rows={2} />
                      </FormControl>
                      <div className="min-h-[20px]">
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="immediateDelivery"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormLabel className="font-normal cursor-pointer">Entrega inmediata</FormLabel>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {serverError && (
                  <div className="flex items-start gap-2 px-6 pb-4">
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 w-full">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-sm text-destructive">{serverError}</p>
                    </div>
                  </div>
                )}
              </ResponsiveModalBody>

              <SaleFooter
                total={total}
                isSubmitting={isSubmitting}
                onCancel={handleClose}
                submitLabel="Registrar venta"
              />
            </form>
          </Form>
        )}
      </ResponsiveModal>

      <AddProductSheet
        key={addProductKey}
        open={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        variants={variants}
        onAdd={handleAddProduct}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={handleNewClientSuccess}
        canUseContactFields={user.capabilities?.includes('client.contact-fields') ?? isOwner}
        canManageZones={user.capabilities?.includes('zones.manage') ?? isOwner}
      />
    </>
  );
}
