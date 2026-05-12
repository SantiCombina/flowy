'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import {
  registerCommissionPaymentSchema,
  type RegisterCommissionPaymentValues,
} from '@/schemas/commissions/register-payment-schema';

import { registerCommissionPaymentAction } from './commission-actions';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  check: 'Cheque',
};

interface RegisterCommissionPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sellerId: number;
  sellerName: string;
  pendingBalance: number;
}

export function RegisterCommissionPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  sellerId,
  sellerName,
  pendingBalance,
}: RegisterCommissionPaymentModalProps) {
  const { executeAsync, isExecuting } = useAction(registerCommissionPaymentAction);
  const { invalidateQueries } = useInvalidateQueries();

  const form = useForm<RegisterCommissionPaymentValues>({
    resolver: zodResolver(registerCommissionPaymentSchema),
    defaultValues: {
      sellerId,
      amount: pendingBalance > 0 ? pendingBalance : 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'transfer',
      reference: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        sellerId,
        amount: pendingBalance > 0 ? pendingBalance : 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'transfer',
        reference: '',
        notes: '',
      });
    }
  }, [isOpen, sellerId, pendingBalance]);

  const onSubmit = async (data: RegisterCommissionPaymentValues) => {
    const result = await executeAsync(data);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Pago de comisión registrado correctamente');
      invalidateQueries([queryKeys.sellers.list()]);
      onSuccess();
      onClose();
    } else {
      toast.error('Error al registrar el pago de comisión');
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Registrar pago de comisión</ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Pago para {sellerName} — Saldo pendiente: {formatCurrency(pendingBalance)}
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <ResponsiveModalBody className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <PriceInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
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

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="Número de transferencia, comprobante..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} placeholder="Notas opcionales..." rows={2} />
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
              {isExecuting ? 'Registrando…' : 'Registrar pago'}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </Form>
    </ResponsiveModal>
  );
}
