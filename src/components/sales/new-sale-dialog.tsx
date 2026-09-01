'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch, type DefaultValues } from 'react-hook-form';

import type { SaleClientOption } from '@/app/services/sales';
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
import type { Client } from '@/payload-types';
import { saleSchema, type SaleValues } from '@/schemas/sales/sale-schema';

import { getClientsForSaleAction } from '../clients/actions';

import { createSaleAction, getSaleOptionsAction, getSaleOptionsAsOwnerAction } from './actions';
import { SaleCreationFlow } from './sale-creation-flow';
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

const DEFAULT_SALE_VALUES: DefaultValues<SaleValues> = {
  items: [],
  paymentMethod: undefined,
  clientId: undefined,
  notes: undefined,
  checkDueDate: undefined,
  immediateDelivery: true,
};

function hasMeaningfulSaleData(values: SaleValues) {
  return (
    values.items.length > 0 ||
    values.clientId !== undefined ||
    values.paymentMethod !== undefined ||
    Boolean(values.notes?.trim()) ||
    values.checkDueDate !== undefined ||
    values.immediateDelivery === false
  );
}

export function NewSaleDialog({ isOpen, onClose, onSuccess }: NewSaleDialogProps) {
  const user = useUser();
  const isOwner = user?.role === 'owner';
  const canUseCredit = user.capabilities?.includes('sale.credit') ?? isOwner;
  const canUsePersonalStock = user.capabilities?.includes('inventory.mobile') ?? isOwner;
  const canUseContactFields = user.capabilities?.includes('client.contact-fields') ?? false;
  const canManageZones = user.capabilities?.includes('zones.manage') ?? false;
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

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientsOverride, setClientsOverride] = useState<SaleClientOption[] | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [addProductKey, setAddProductKey] = useState(0);
  const pendingCloseRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState('products');

  const variants = optionsResult?.variants ?? [];
  const localClients = clientsOverride ?? optionsResult?.clients ?? [];

  const form = useForm<SaleValues>({
    resolver: zodResolver(saleSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: DEFAULT_SALE_VALUES,
  });

  const draft = useFormDraft({
    form,
    storageKey: `flowy:draft:new-sale:${user.id}`,
  });

  const handleFlowSuccess = () => {
    draft.clearDraft();
    for (let i = fields.length - 1; i >= 0; i--) {
      remove(i);
    }
    form.reset(DEFAULT_SALE_VALUES);
    onSuccess();
  };

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const itemCount = watchedItems?.length ?? 0;
  const itemsError = useFirstItemsErrorMessage(form.formState.errors.items);
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });

  const handleConfirmCancel = () => {
    draft.clearDraft();
    for (let i = fields.length - 1; i >= 0; i--) {
      remove(i);
    }
    form.reset(DEFAULT_SALE_VALUES);
    setIsCancelAlertOpen(false);
    pendingCloseRef.current?.();
    pendingCloseRef.current = null;
  };

  useEffect(() => {
    if (!canUseCredit && paymentMethod === 'credit') {
      form.setValue('paymentMethod', 'cash');
    }
  }, [canUseCredit, paymentMethod, form]);

  const handleClose = () => {
    setClientsOverride(null);
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

  return (
    <>
      <ResponsiveModal
        open={isOpen}
        onOpenChange={handleClose}
        className="flex flex-col gap-0 overflow-hidden h-dvh sm:max-w-5xl sm:h-[85vh]"
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Registrar venta</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <SaleCreationFlow
          isOpen={isOpen}
          businessName={user.businessName ?? null}
          submitSale={submitSale}
          onSuccess={handleFlowSuccess}
          onClose={handleClose}
          renderForm={({ submit, serverError, close }) => {
            const handleCancelClick = () => {
              pendingCloseRef.current = close;
              if (hasMeaningfulSaleData(form.getValues())) {
                setIsCancelAlertOpen(true);
                return;
              }
              handleConfirmCancel();
            };
            return isLoadingOptions ? (
              <SaleFormSkeleton isMobile={isMobile} />
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(submit, (errors) => {
                    if (errors.items) {
                      setActiveTab('products');
                      focusFirstError();
                    } else {
                      setActiveTab('details');
                      focusFirstError();
                    }
                  })}
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
                            canUsePersonalStock={canUsePersonalStock}
                          />
                        </TabsContent>
                        <TabsContent value="details" className="mt-0 px-6 py-4">
                          <DetailsTab
                            form={form}
                            clients={localClients}
                            onNewClient={() => setIsClientModalOpen(true)}
                            canUseCredit={canUseCredit}
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
                            canUsePersonalStock={canUsePersonalStock}
                          />
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-col">
                          <DetailsTab
                            form={form}
                            clients={localClients}
                            onNewClient={() => setIsClientModalOpen(true)}
                            canUseCredit={canUseCredit}
                          />
                        </div>
                      </div>
                    )}
                  </ResponsiveModalBody>

                  {serverError && (
                    <div
                      role="alert"
                      className="flex shrink-0 items-start gap-2 border-t border-destructive/20 bg-destructive/5 px-6 py-3"
                    >
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <p className="text-sm leading-5 text-destructive">{serverError}</p>
                    </div>
                  )}

                  <SaleFooter
                    total={total}
                    isSubmitting={isSubmitting}
                    onCancel={handleCancelClick}
                    submitLabel="Registrar venta"
                  />
                </form>
              </Form>
            );
          }}
        />
      </ResponsiveModal>

      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>Se perderán los datos ingresados y no podrás recuperarlos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} variant="destructive">
              Descartar venta
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
