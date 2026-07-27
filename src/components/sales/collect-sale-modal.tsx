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
import { calculateCommission, subtractMoney } from '@/lib/money';
import { cn, formatCurrency } from '@/lib/utils';
import { collectSaleSchema, type CollectSaleValues } from '@/schemas/sales/collect-sale-schema';

import { registerSalePaymentAction } from './actions';

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
}

export function CollectSaleModal({ isOpen, onClose, onSuccess, saleId, total, amountPaid }: CollectSaleModalProps) {
  const { executeAsync, isExecuting } = useAction(registerSalePaymentAction);
  const remaining = subtractMoney(total, amountPaid);

  const form = useForm<CollectSaleValues>({
    resolver: zodResolver(collectSaleSchema),
    defaultValues: { saleId, amount: remaining },
  });

  const watchedAmount = useWatch({ control: form.control, name: 'amount' });
  const commissionBase = Number.isFinite(watchedAmount) && watchedAmount > 0 ? watchedAmount : 0;
  const alreadyEarnedCommission = calculateCommission(amountPaid, 3);
  const newCommission = calculateCommission(commissionBase, 3);
  const commission = alreadyEarnedCommission + newCommission;
  const watchedPaymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const afterPayment =
    Number.isFinite(watchedAmount) && watchedAmount > 0 ? subtractMoney(remaining, watchedAmount) : null;
  const isOverRemaining = Number.isFinite(watchedAmount) && Number(watchedAmount.toFixed(2)) > remaining;

  useEffect(() => {
    if (isOpen) {
      form.reset({ saleId, amount: remaining });
    }
  }, [isOpen, saleId, remaining, form]);

  const onSubmit = async (data: CollectSaleValues) => {
    const result = await executeAsync(data);

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
    <div className="rounded-lg bg-muted/50 p-4 text-sm shadow-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Total de la venta</span>
        <span>{formatCurrency(total)}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-muted-foreground">Comisión de este cobro (3%)</span>
        <span className="text-blue-600">{formatCurrency(newCommission)}</span>
      </div>
      {amountPaid > 0 && (
        <>
          <div className="flex justify-between mt-1">
            <span className="text-muted-foreground">Ya cobrado</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-muted-foreground">Comisión acumulada</span>
            <span className="text-blue-600">{formatCurrency(commission)}</span>
          </div>
        </>
      )}
      <Separator className="my-2" />
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>{formatCurrency(remaining)}</span>
      </div>
      {afterPayment !== null && !isOverRemaining && (
        <div
          className={`flex justify-between mt-2 text-xs font-medium ${afterPayment <= 0 ? 'text-success' : 'text-warning'}`}
        >
          <span>{afterPayment <= 0 ? 'Quedará saldada' : 'Quedará pendiente'}</span>
          <span>{afterPayment <= 0 ? formatCurrency(0) : formatCurrency(Math.max(0, afterPayment))}</span>
        </div>
      )}
      {isOverRemaining && (
        <div className="flex justify-between mt-2 text-xs font-medium text-destructive">
          <span>El monto supera lo pendiente</span>
          <span>{formatCurrency(remaining)}</span>
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ResponsiveModalBody className="space-y-4">
            {summaryBlock}

            <FormField
              control={form.control}
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
              control={form.control}
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
            <Button type="submit" disabled={isExecuting || isOverRemaining}>
              {isExecuting ? 'Registrando…' : 'Registrar cobro'}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </Form>
    </ResponsiveModal>
  );
}
