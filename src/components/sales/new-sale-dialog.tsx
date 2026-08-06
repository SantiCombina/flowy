'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useCallback, useEffect, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { SaleClientOption } from '@/app/services/sales';
import { ClientModal } from '@/components/clients/client-modal';
import { useUser } from '@/components/providers/user-provider';
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
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });

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
        className="flex flex-col gap-0 overflow-hidden h-dvh sm:max-w-5xl sm:h-[85vh]"
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
        canUseContactFields={canUseContactFields}
        canManageZones={canManageZones}
      />
    </>
  );
}
