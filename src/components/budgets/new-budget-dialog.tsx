'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { SaleClientOption, SaleVariantOption } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { useUser } from '@/components/providers/user-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form } from '@/components/ui/form';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFormDraft } from '@/hooks/use-form-draft';
import { useIsMobile } from '@/hooks/use-mobile';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import type { Budget, Client } from '@/payload-types';
import { budgetSchema, type BudgetValues } from '@/schemas/budgets/budget-schema';

import { getClientsForSaleAction } from '../clients/actions';

import { createBudgetAction, getBudgetByIdAction, getBudgetOptionsAction, updateBudgetAction } from './actions';
import {
  AddProductSheet,
  BudgetFooter,
  BudgetFormSkeleton,
  DetailsTab,
  ProductsTab,
  useFirstItemsErrorMessage,
} from './budget-form-parts';

interface NewBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBudgetId?: number;
}

function hasMeaningfulBudgetData(values: BudgetValues) {
  return (
    values.items.length > 0 ||
    values.clientId !== undefined ||
    Boolean(values.clientPhone?.trim()) ||
    Boolean(values.validUntil?.trim()) ||
    Boolean(values.notes?.trim()) ||
    values.saveClientPhone === true
  );
}

function NewBudgetDialogComponent({ isOpen, onClose, onSuccess, editBudgetId }: NewBudgetDialogProps) {
  const isEditing = editBudgetId !== undefined;
  const currentUser = useUser();
  const isMobile = useIsMobile();
  const canUseRecipientPhone =
    currentUser.capabilities?.includes('budget.recipient-phone') ?? currentUser.role === 'owner';
  const canUseContactFields = currentUser.capabilities?.includes('client.contact-fields') ?? false;
  const canManageZones = currentUser.capabilities?.includes('zones.manage') ?? false;

  const { data: options, isPending: isLoadingOptions } = useServerActionQuery({
    queryKey: queryKeys.budgets.options(),
    queryFn: () => getBudgetOptionsAction(),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const { data: budgetData, isPending: isLoadingBudget } = useServerActionQuery({
    queryKey: queryKeys.budgets.detail(editBudgetId ?? 0),
    queryFn: () => getBudgetByIdAction({ budgetId: editBudgetId ?? 0 }),
    enabled: isOpen && !!editBudgetId,
  });

  const { executeAsync: createBudget, isExecuting: isCreating } = useAction(createBudgetAction);
  const { executeAsync: updateBudget, isExecuting: isUpdating } = useAction(updateBudgetAction);
  const isSubmitting = isCreating || isUpdating;
  const [serverError, setServerError] = useState<string | null>(null);
  const [clientsOverride, setClientsOverride] = useState<SaleClientOption[] | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [addProductKey, setAddProductKey] = useState(0);
  const [activeTab, setActiveTab] = useState('products');

  const variants: SaleVariantOption[] = options?.variants ?? [];
  const localClients: SaleClientOption[] = clientsOverride ?? options?.clients ?? [];

  const form = useForm<BudgetValues>({
    resolver: zodResolver(budgetSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      items: [],
      saveClientPhone: false,
    },
  });

  const draft = useFormDraft({
    form,
    storageKey: `flowy:draft:new-budget:${currentUser.id}`,
    enabled: !isEditing,
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

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const itemCount = watchedItems?.length ?? 0;
  const itemsError = useFirstItemsErrorMessage(form.formState.errors.items);

  const selectedClientId = useWatch({
    control: form.control,
    name: 'clientId',
  });
  const selectedClient = localClients.find((c) => c.id === selectedClientId);

  const getDefaultFormValues = (): BudgetValues => ({
    items: [],
    saveClientPhone: false,
  });

  const handleClose = () => {
    setClientsOverride(null);
    setServerError(null);
    setActiveTab('products');
    if (isEditing) {
      form.reset(getDefaultFormValues());
    }
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
      setClientsOverride([
        ...localClients,
        {
          id: newClient.id,
          name: newClient.name,
          phone: newClient.phone ?? undefined,
        },
      ]);
    }
    form.setValue('clientId', newClient.id);
    if (newClient.phone && canUseRecipientPhone) {
      form.setValue('clientPhone', newClient.phone);
    }
    setIsClientModalOpen(false);
  };

  const handleAddProduct = (item: { variantId: number; quantity: number; unitPrice: number }) => {
    prepend(item);
  };

  const handleClientChange = (value: string) => {
    const id = value ? Number(value) : undefined;
    form.setValue('clientId', id, { shouldValidate: true });

    const client = localClients.find((c) => c.id === id);
    if (canUseRecipientPhone && client?.phone) {
      form.setValue('clientPhone', client.phone);
    } else {
      form.setValue('clientPhone', undefined);
    }
    form.setValue('saveClientPhone', false);
  };

  const handleCancelClick = () => {
    if (isEditing || !hasMeaningfulBudgetData(form.getValues())) {
      handleClose();
      return;
    }
    setIsCancelAlertOpen(true);
  };

  const handleDiscard = () => {
    form.reset(getDefaultFormValues());
    draft.clearDraft();
    setIsCancelAlertOpen(false);
    handleClose();
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
        }
      }
      return;
    }

    setActiveTab('details');
    const firstError = Object.keys(errors)[0] as keyof BudgetValues;
    if (firstError) {
      setTimeout(() => form.setFocus(firstError), 50);
    }
  }, [form]);

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
        if (!isEditing) {
          draft.clearDraft();
        }
        toast.success(isEditing ? 'Presupuesto actualizado' : 'Presupuesto creado');
        onSuccess();
        onClose();
      }
    },
    [editBudgetId, createBudget, updateBudget, onSuccess, onClose, isEditing],
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
        className="flex flex-col gap-0 overflow-hidden h-dvh sm:max-w-5xl sm:h-[85vh]"
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        {isLoadingOptions || (isEditing && isLoadingBudget) ? (
          <BudgetFormSkeleton isMobile={isMobile} />
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
              <ResponsiveModalBody className="flex-1 overflow-y-auto p-0 sm:block sm:overflow-hidden sm:px-4 sm:py-4">
                {isMobile ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                    <div className="sticky top-0 z-10 bg-background px-6 pt-4 pb-0">
                      <TabsList className="w-full">
                        <TabsTrigger value="products" className="flex-1 gap-1.5">
                          Productos
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-foreground">
                            {itemCount}
                          </span>
                        </TabsTrigger>
                        <TabsTrigger value="details" className="flex-1">
                          Detalles
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="products" className="mt-0 px-6 py-4">
                      <ProductsTab
                        form={form}
                        fields={fields}
                        remove={remove}
                        variants={variants}
                        onAddProduct={handleOpenAddProduct}
                        itemError={itemsError}
                      />
                    </TabsContent>
                    <TabsContent value="details" className="mt-0 px-6 py-4">
                      <DetailsTab
                        form={form}
                        clients={localClients}
                        onNewClient={() => setIsClientModalOpen(true)}
                        onClientChange={handleClientChange}
                        canUseRecipientPhone={canUseRecipientPhone}
                        selectedClientPhone={selectedClient?.phone}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="flex min-h-0 min-w-0 flex-col">
                      <ProductsTab
                        form={form}
                        fields={fields}
                        remove={remove}
                        variants={variants}
                        onAddProduct={handleOpenAddProduct}
                        itemError={itemsError}
                      />
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-col">
                      <DetailsTab
                        form={form}
                        clients={localClients}
                        onNewClient={() => setIsClientModalOpen(true)}
                        onClientChange={handleClientChange}
                        canUseRecipientPhone={canUseRecipientPhone}
                        selectedClientPhone={selectedClient?.phone}
                      />
                    </div>
                  </div>
                )}

                {serverError && (
                  <div className="flex items-start gap-2 px-6 pb-4">
                    <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 w-full">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-sm text-destructive">{serverError}</p>
                    </div>
                  </div>
                )}
              </ResponsiveModalBody>

              <BudgetFooter
                total={total}
                isSubmitting={isSubmitting}
                onCancel={handleCancelClick}
                submitLabel={isEditing ? 'Guardar cambios' : 'Crear presupuesto'}
                isEditing={isEditing}
              />
            </form>
          </Form>
        )}
      </ResponsiveModal>

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar este presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>Se perderán los datos ingresados y no podrás recuperarlos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} variant="destructive">
              Descartar presupuesto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        canUseContactFields={canUseContactFields}
        canManageZones={canManageZones}
      />
    </>
  );
}

export { NewBudgetDialogComponent as NewBudgetDialog };
