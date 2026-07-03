'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Trash2, XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { SaleClientOption, SaleVariantOption } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PriceInput } from '@/components/ui/price-input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Textarea } from '@/components/ui/textarea';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import type { Budget, Client } from '@/payload-types';
import { budgetSchema, type BudgetValues } from '@/schemas/budgets/budget-schema';

import { getClientsForSaleAction } from '../clients/actions';

import { createBudgetAction, getBudgetByIdAction, getBudgetOptionsAction, updateBudgetAction } from './actions';

interface NewBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBudgetId?: number;
}

function NewBudgetDialogComponent({ isOpen, onClose, onSuccess, editBudgetId }: NewBudgetDialogProps) {
  const isEditing = editBudgetId !== undefined;

  const { data: options, isPending: isLoadingOptions } = useServerActionQuery({
    queryKey: queryKeys.budgets.options(),
    queryFn: () => getBudgetOptionsAction(),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const { executeAsync: createBudget, isExecuting: isCreating } = useAction(createBudgetAction);
  const { executeAsync: updateBudget, isExecuting: isUpdating } = useAction(updateBudgetAction);
  const isSubmitting = isCreating || isUpdating;
  const [serverError, setServerError] = useState<string | null>(null);
  const [clientsOverride, setClientsOverride] = useState<SaleClientOption[] | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  const { data: budgetData, isPending: isLoadingBudget } = useServerActionQuery({
    queryKey: queryKeys.budgets.detail(editBudgetId ?? 0),
    queryFn: () => getBudgetByIdAction({ budgetId: editBudgetId ?? 0 }),
    enabled: isOpen && !!editBudgetId,
  });

  const getDefaultFormValues = () =>
    ({
      items: [{ variantId: 0, quantity: 1, unitPrice: 0 }],
      saveClientPhone: false,
    }) as BudgetValues;

  const variants: SaleVariantOption[] = options?.variants ?? [];
  const localClients: SaleClientOption[] = clientsOverride ?? options?.clients ?? [];

  const form = useForm<BudgetValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: getDefaultFormValues(),
  });

  const previousBudgetId = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!budgetData?.success || !budgetData.budget) return;
    if (previousBudgetId.current === editBudgetId && form.getValues('items').length > 0) return;
    previousBudgetId.current = editBudgetId;

    const budget = budgetData.budget;
    const clientId =
      budget.client && typeof budget.client === 'object' ? budget.client.id : (budget.client ?? undefined);

    form.reset({
      items: budget.items.map((item: Budget['items'][number]) => ({
        variantId: typeof item.variant === 'object' ? item.variant.id : item.variant,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      clientId: clientId,
      clientPhone: budget.clientPhone ?? undefined,
      validUntil: budget.validUntil?.split('T')[0] ?? undefined,
      notes: budget.notes ?? undefined,
      saveClientPhone: false,
    });
  }, [budgetData, editBudgetId, form]);

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const selectedClientId = useWatch({ control: form.control, name: 'clientId' });
  const watchedClientPhone = useWatch({ control: form.control, name: 'clientPhone' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const hasUnselectedVariant = (watchedItems ?? []).some((item) => !item.variantId || item.variantId === 0);

  const selectedClient = localClients.find((c) => c.id === selectedClientId);
  const clientDefaultPhone = selectedClient?.phone;
  const phoneWasEdited =
    watchedClientPhone !== undefined && watchedClientPhone !== '' && watchedClientPhone !== clientDefaultPhone;

  const handleClose = () => {
    setClientsOverride(null);
    setServerError(null);
    form.reset(getDefaultFormValues());
    onClose();
  };

  const handleClientChange = (value: string) => {
    const id = value ? Number(value) : undefined;
    form.setValue('clientId', id, { shouldValidate: true });

    const client = localClients.find((c) => c.id === id);
    if (client?.phone) {
      form.setValue('clientPhone', client.phone);
    } else {
      form.setValue('clientPhone', undefined);
    }
    form.setValue('saveClientPhone', false);
  };

  const handleNewClientSuccess = async (newClient: Client) => {
    const result = await getClientsForSaleAction();
    if (result?.data?.success && result.data.clients) {
      setClientsOverride(result.data.clients);
    } else {
      setClientsOverride([
        ...localClients,
        { id: newClient.id, name: newClient.name, phone: newClient.phone ?? undefined },
      ]);
    }
    form.setValue('clientId', newClient.id);
    if (newClient.phone) {
      form.setValue('clientPhone', newClient.phone);
    }
    setIsClientModalOpen(false);
  };

  const onSubmit = useCallback(
    async (data: BudgetValues) => {
      setServerError(null);

      const hasPhoneToSave = data.saveClientPhone && data.clientPhone && data.clientId;
      const submitData = {
        ...data,
        saveClientPhone: hasPhoneToSave ? true : undefined,
      };

      const result = editBudgetId
        ? await updateBudget({ budgetId: editBudgetId, data: submitData })
        : await createBudget(submitData);

      if (result?.serverError) {
        setServerError(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success(editBudgetId ? 'Presupuesto actualizado' : 'Presupuesto creado');
        onSuccess();
        onClose();
      }
    },
    [editBudgetId, createBudget, updateBudget, onSuccess, onClose],
  );

  const formatTotal = (value: number) =>
    value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleFormSubmit = form.handleSubmit(onSubmit);

  return (
    <>
      <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-3xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {isEditing
              ? 'Actualizá los datos del presupuesto.'
              : 'Completá los datos del presupuesto para compartirlo con el cliente.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {isLoadingOptions || (isEditing && isLoadingBudget) ? (
          <ResponsiveModalBody className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              {isEditing && isLoadingBudget ? 'Cargando presupuesto…' : 'Cargando productos…'}
            </p>
          </ResponsiveModalBody>
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
              className="flex flex-col flex-1 min-h-0"
            >
              <ResponsiveModalBody className="flex flex-col gap-3">
                <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_80px_110px_32px] gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Producto</p>
                  <p className="text-xs font-medium text-muted-foreground">Cant.</p>
                  <p className="text-xs font-medium text-muted-foreground">Precio unit.</p>
                  <div />
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative flex flex-col gap-3 rounded-lg border bg-card p-3 sm:grid sm:grid-cols-[1fr_80px_110px_32px] sm:items-start sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
                  >
                    <FormField
                      control={form.control}
                      name={`items.${index}.variantId`}
                      render={({ field: variantField, fieldState }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Combobox
                              options={variants.map((v) => {
                                const parts = [v.brandName ?? null, v.productName, v.presentationLabel ?? null].filter(
                                  Boolean,
                                );
                                return {
                                  value: String(v.variantId),
                                  label: parts.join(' · '),
                                };
                              })}
                              value={variantField.value ? String(variantField.value) : ''}
                              onValueChange={(value) => {
                                const id = Number(value);
                                form.setValue(`items.${index}.variantId`, id, { shouldValidate: true });
                                form.setValue(`items.${index}.quantity`, 1);

                                const variant = variants.find((v) => v.variantId === id);
                                if (variant) {
                                  form.setValue(`items.${index}.unitPrice`, variant.price);
                                }
                              }}
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

                    <div className="flex gap-2 sm:contents">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field: qtyField, fieldState }) => (
                          <FormItem className="flex-1 sm:flex-none">
                            <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Cant.</p>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="1"
                                value={qtyField.value || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  qtyField.onChange(val >= 1 ? val : 1);
                                }}
                                className={fieldState.error ? 'border-destructive' : ''}
                                disabled={!watchedItems?.[index]?.variantId}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field: priceField, fieldState }) => (
                          <FormItem className="flex-1 sm:flex-none">
                            <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Precio</p>
                            <FormControl>
                              <PriceInput
                                value={priceField.value}
                                onChange={priceField.onChange}
                                onBlur={priceField.onBlur}
                                className={fieldState.error ? 'border-destructive' : ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive sm:static sm:h-9 sm:w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {form.formState.errors.items?.root && (
                  <p className="text-sm text-destructive">{form.formState.errors.items.root.message}</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => append({ variantId: 0, quantity: 1, unitPrice: 0 })}
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
                            onValueChange={handleClientChange}
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
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono del cliente</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder={selectedClient?.phone ?? 'Ingresá un teléfono'}
                            type="tel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {phoneWasEdited && selectedClientId && (
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

                  <FormField
                    control={form.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Válido hasta (opcional)</FormLabel>
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
                                  ? format(new Date(`${field.value}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })
                                  : 'Sin vencimiento'}
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (opcional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Condiciones, observaciones..." rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {serverError && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
                    <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{serverError}</p>
                  </div>
                )}
              </ResponsiveModalBody>

              <ResponsiveModalFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-base font-semibold text-primary">$ {formatTotal(total)}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting || variants.length === 0 || hasUnselectedVariant}>
                    {isSubmitting
                      ? isEditing
                        ? 'Guardando…'
                        : 'Creando…'
                      : isEditing
                        ? 'Guardar cambios'
                        : 'Crear presupuesto'}
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

export { NewBudgetDialogComponent as NewBudgetDialog };
