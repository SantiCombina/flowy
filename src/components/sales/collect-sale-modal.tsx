'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Separator } from '@/components/ui/separator';
import { collectSaleSchema, type CollectSaleValues } from '@/schemas/sales/collect-sale-schema';

import { markSaleAsCollectedAction } from './actions';

interface CollectSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saleId: number, newAmountPaid: number, newStatus: 'partially_collected' | 'collected') => void;
  saleId: number;
  total: number;
  amountPaid: number;
}

export function CollectSaleModal({ isOpen, onClose, onSuccess, saleId, total, amountPaid }: CollectSaleModalProps) {
  const { executeAsync, isExecuting } = useAction(markSaleAsCollectedAction);
  const remaining = total - amountPaid;

  const form = useForm<CollectSaleValues>({
    resolver: zodResolver(collectSaleSchema),
    defaultValues: { saleId, amount: remaining },
  });

  const enteredAmount = useWatch({ control: form.control, name: 'amount' });
  const afterPayment = Number.isFinite(enteredAmount) && enteredAmount > 0 ? remaining - enteredAmount : null;

  useEffect(() => {
    if (isOpen) {
      form.reset({ saleId, amount: remaining });
    }
  }, [isOpen, saleId, remaining]);

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
      onSuccess(saleId, newAmountPaid, newStatus);
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-sm">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Registrar cobro</ResponsiveModalTitle>
        <ResponsiveModalDescription>Ingresá el monto recibido.</ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ResponsiveModalBody className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de la venta</span>
                <span>$ {total.toLocaleString('es-AR')}</span>
              </div>
              {amountPaid > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Ya cobrado</span>
                  <span>$ {amountPaid.toLocaleString('es-AR')}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Restante</span>
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

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a cobrar</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      autoFocus
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
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
    </ResponsiveModal>
  );
}
