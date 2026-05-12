'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { calculateCommission } from '@/lib/commissions';
import { cn } from '@/lib/utils';
import {
  collectSaleBySellerSchema,
  collectSaleSchema,
  type CollectSaleBySellerValues,
  type CollectSaleValues,
} from '@/schemas/sales/collect-sale-schema';

import { markSaleAsCollectedAction, markSaleAsCollectedBySellerAction } from './actions';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
};

interface CollectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  saleId: number;
  total: number;
  amountPaid: number;
  isSeller: boolean;
}

export function CollectSaleModal({
  isOpen,
  onClose,
  onSuccess,
  saleId,
  total,
  amountPaid,
  isSeller,
}: CollectSaleModalProps) {
  const { executeAsync: executeOwner, isExecuting: isExecutingOwner } = useAction(markSaleAsCollectedAction);
  const { executeAsync: executeSeller, isExecuting: isExecutingSeller } = useAction(markSaleAsCollectedBySellerAction);
  const isExecuting = isExecutingOwner || isExecutingSeller;
  const remaining = total - amountPaid;

  const sellerForm = useForm<CollectSaleBySellerValues>({
    resolver: zodResolver(collectSaleBySellerSchema),
    defaultValues: { saleId, amount: remaining },
  });

  const ownerForm = useForm<CollectSaleValues>({
    resolver: zodResolver(collectSaleSchema),
    defaultValues: { saleId, amount: remaining },
  });

  const commission = calculateCommission(amountPaid);
  const watchedAmountSeller = useWatch({ control: sellerForm.control, name: 'amount' });
  const watchedAmountOwner = useWatch({ control: ownerForm.control, name: 'amount' });
  const watchedAmount = isSeller ? watchedAmountSeller : watchedAmountOwner;
  const watchedPaymentMethod = useWatch({ control: sellerForm.control, name: 'paymentMethod' });
  const afterPayment = Number.isFinite(watchedAmount) && watchedAmount > 0 ? remaining - watchedAmount : null;

  useEffect(() => {
    if (isOpen) {
      sellerForm.reset({ saleId, amount: remaining });
      ownerForm.reset({ saleId, amount: remaining });
    }
  }, [isOpen, saleId, remaining]);

  const onSubmitOwner = async (data: CollectSaleValues) => {
    const result = await executeOwner(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      const newAmountPaid = amountPaid + data.amount;
      const newStatus = newAmountPaid >= total ? 'collected' : 'partially_collected';
      toast.success(newStatus === 'collected' ? 'Venta cobrada completamente.' : 'Cobro parcial registrado.');
      onSuccess();
    }
  };

  const onSubmitSeller = async (data: CollectSaleBySellerValues) => {
    const result = await executeSeller(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      const newAmountPaid = amountPaid + data.amount;
      const newStatus = newAmountPaid >= total ? 'collected' : 'partially_collected';
      toast.success(newStatus === 'collected' ? 'Venta cobrada completamente.' : 'Cobro parcial registrado.');
      onSuccess();
    }
  };

  const summaryBlock = (
    <div className="rounded-lg border bg-muted/50 p-4 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Total de la venta</span>
        <span>$ {total.toLocaleString('es-AR')}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-muted-foreground">Comisión vendedor (3%)</span>
        <span className="text-blue-600 dark:text-blue-400">
          $ {commission.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      </div>
      {amountPaid > 0 && (
        <div className="flex justify-between mt-1">
          <span className="text-muted-foreground">Ya cobrado</span>
          <span>$ {amountPaid.toLocaleString('es-AR')}</span>
        </div>
      )}
      <Separator className="my-2" />
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>$ {remaining.toLocaleString('es-AR')}</span>
      </div>
      {afterPayment !== null && (
        <div
          className={`flex justify-between mt-2 text-xs font-medium ${afterPayment <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}
        >
          <span>{afterPayment <= 0 ? 'Quedará saldada' : 'Quedará pendiente'}</span>
          <span>{afterPayment <= 0 ? '$ 0' : `$ ${Math.max(0, afterPayment).toLocaleString('es-AR')}`}</span>
        </div>
      )}
    </div>
  );

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-sm">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Registrar cobro</ResponsiveModalTitle>
        <ResponsiveModalDescription>Ingresá el monto recibido.</ResponsiveModalDescription>
      </ResponsiveModalHeader>

      {isSeller ? (
        <Form {...sellerForm}>
          <form onSubmit={sellerForm.handleSubmit(onSubmitSeller)} className="flex flex-col flex-1 min-h-0">
            <ResponsiveModalBody className="space-y-4">
              {summaryBlock}

              <FormField
                control={sellerForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de pago</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedPaymentMethod === 'check' && (
                <FormField
                  control={sellerForm.control}
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
                                ? format(new Date(`${field.value}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es })
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={sellerForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto a cobrar</FormLabel>
                    <FormControl>
                      <PriceInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ResponsiveModalBody>

            <ResponsiveModalFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isExecuting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? 'Registrando…' : 'Registrar cobro'}
              </Button>
            </ResponsiveModalFooter>
          </form>
        </Form>
      ) : (
        <Form {...ownerForm}>
          <form onSubmit={ownerForm.handleSubmit(onSubmitOwner)} className="flex flex-col flex-1 min-h-0">
            <ResponsiveModalBody className="space-y-4">
              {summaryBlock}

              <FormField
                control={ownerForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto a cobrar</FormLabel>
                    <FormControl>
                      <PriceInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </ResponsiveModalBody>

            <ResponsiveModalFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isExecuting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? 'Registrando…' : 'Registrar cobro'}
              </Button>
            </ResponsiveModalFooter>
          </form>
        </Form>
      )}
    </ResponsiveModal>
  );
}
