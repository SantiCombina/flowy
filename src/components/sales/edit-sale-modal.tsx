'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useState } from 'react';
import { type UseFormReturn, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { SaleClientOption, SaleRow } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { Form } from '@/components/ui/form';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import type { Client } from '@/payload-types';
import { editSaleFullSchema, type EditSaleFullValues } from '@/schemas/sales/edit-sale-full-schema';
import { type SaleValues } from '@/schemas/sales/sale-schema';

import { getClientsForSaleAction } from '../clients/actions';

import {
  editSaleFullAction,
  getClientsForOwnerAction,
  getSaleOptionsAction,
  getSaleOptionsForOwnerAction,
} from './actions';
import {
  AddProductSheet,
  DetailsTab,
  ProductsTab,
  SaleFooter,
  SaleFormSkeleton,
  useFirstItemsErrorMessage,
} from './sale-form-parts';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: SaleRow;
  isSeller: boolean;
}

export function EditSaleModal({ isOpen, onClose, onSuccess, sale, isSeller }: EditSaleModalProps) {
  const isMobile = useIsMobile();
  const { data: sellerOptions, isPending: isLoadingSellerOptions } = useServerActionQuery({
    queryKey: queryKeys.sales.options('seller'),
    queryFn: () => getSaleOptionsAction(),
    enabled: isOpen && isSeller,
    staleTime: 60_000,
  });
  const { data: ownerOptions, isPending: isLoadingOwnerOptions } = useServerActionQuery({
    queryKey: queryKeys.sales.options('owner', sale.sellerId),
    queryFn: () => getSaleOptionsForOwnerAction({ sellerId: sale.sellerId }),
    enabled: isOpen && !isSeller,
    staleTime: 60_000,
  });
  const { executeAsync: submitEdit, isExecuting: isSubmitting } = useAction(editSaleFullAction);

  const isLoadingOptions = isSeller ? isLoadingSellerOptions : isLoadingOwnerOptions;
  const variants = isSeller ? (sellerOptions?.variants ?? []) : (ownerOptions?.variants ?? []);
  const clients = isSeller ? (sellerOptions?.clients ?? []) : (ownerOptions?.clients ?? []);

  const [serverError, setServerError] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientsOverride, setClientsOverride] = useState<SaleClientOption[] | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addProductKey, setAddProductKey] = useState(0);
  const [activeTab, setActiveTab] = useState('products');

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

  const { fields, prepend, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const total = (watchedItems ?? []).reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const itemCount = watchedItems?.length ?? 0;
  const itemsError = useFirstItemsErrorMessage(form.formState.errors.items);

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
  }, [isOpen, sale, form]);

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
    if (isSeller) {
      const result = await getClientsForSaleAction();
      if (result?.data?.success && result.data.clients) {
        setClientsOverride(result.data.clients);
      } else {
        setClientsOverride([...localClients, { id: newClient.id, name: newClient.name }]);
      }
    } else {
      const result = await getClientsForOwnerAction();
      if (result?.data?.success && result.data.clients) {
        setClientsOverride(result.data.clients);
      } else {
        setClientsOverride([...localClients, { id: newClient.id, name: newClient.name }]);
      }
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
    const firstError = Object.keys(errors)[0] as keyof EditSaleFullValues;
    if (firstError) {
      setTimeout(() => form.setFocus(firstError), 50);
    }
  }, [form]);

  const onSubmit = useCallback(
    async (data: EditSaleFullValues) => {
      setServerError(null);
      const result = await submitEdit(data);

      if (result?.serverError) {
        setServerError(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success('Venta actualizada');
        onSuccess();
        onClose();
      }
    },
    [submitEdit, onSuccess, onClose],
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
        className="flex flex-col gap-0 overflow-hidden sm:max-w-5xl sm:h-[85vh]"
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Editar venta</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        {isLoadingOptions ? (
          <SaleFormSkeleton isMobile={isMobile} />
        ) : (
          <Form {...form}>
            <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col min-h-0">
              <ResponsiveModalBody className="flex-1 min-h-0 overflow-hidden p-0 sm:px-6 sm:py-4">
                {isMobile ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
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
                    <TabsContent value="products" className="mt-0 flex-1 overflow-hidden px-6 py-4">
                      <ProductsTab
                        form={form as unknown as UseFormReturn<SaleValues>}
                        fields={fields}
                        remove={remove}
                        variants={variants}
                        onAddProduct={handleOpenAddProduct}
                        itemError={itemsError}
                      />
                    </TabsContent>
                    <TabsContent value="details" className="mt-0 flex-1 overflow-hidden px-6 py-4">
                      <DetailsTab
                        form={form as unknown as UseFormReturn<SaleValues>}
                        clients={localClients}
                        onNewClient={() => setIsClientModalOpen(true)}
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="grid h-full grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2">
                    <div className="flex min-h-0 flex-col">
                      <ProductsTab
                        form={form as unknown as UseFormReturn<SaleValues>}
                        fields={fields}
                        remove={remove}
                        variants={variants}
                        onAddProduct={handleOpenAddProduct}
                        itemError={itemsError}
                      />
                    </div>
                    <div className="flex min-h-0 flex-col">
                      <DetailsTab
                        form={form as unknown as UseFormReturn<SaleValues>}
                        clients={localClients}
                        onNewClient={() => setIsClientModalOpen(true)}
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

              <SaleFooter
                total={total}
                isSubmitting={isSubmitting}
                onCancel={handleClose}
                submitLabel="Actualizar venta"
                loadingLabel="Guardando…"
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
      />
    </>
  );
}
