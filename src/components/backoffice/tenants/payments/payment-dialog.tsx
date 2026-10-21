'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { TenantPaymentRow } from '@/app/services/backoffice/tenant-payments';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDefaultTenantPaymentPeriod, todayInArgentina } from '@/lib/tenant-payment-values';
import { tenantPaymentSchema, type TenantPaymentValues } from '@/schemas/backoffice/tenant-payment-schema';

import { saveTenantPaymentAction } from './actions';

interface PaymentDialogProps {
  ownerId: number;
  payment: TenantPaymentRow | null;
  plans: { value: string; label: string }[];
  defaultPlan: string;
  planControlDate: string | null;
  onClose(): void;
}

export function PaymentDialog({ ownerId, payment, plans, defaultPlan, planControlDate, onClose }: PaymentDialogProps) {
  const router = useRouter();
  const submitting = useRef(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [saved, setSaved] = useState(false);
  const { executeAsync, isExecuting } = useAction(saveTenantPaymentAction);
  const busy = isExecuting || isRefreshing || saved;
  const today = todayInArgentina();
  const defaultPeriod = getDefaultTenantPaymentPeriod(planControlDate);
  const form = useForm<TenantPaymentValues>({
    resolver: zodResolver(tenantPaymentSchema),
    defaultValues: {
      ownerId, paymentId: payment?.id,
      planSelection: payment ? payment.planVersionId ? String(payment.planVersionId) : 'custom' : defaultPlan,
      periodStart: payment?.periodStart.slice(0, 10) ?? defaultPeriod.periodStart,
      periodEnd: payment?.periodEnd.slice(0, 10) ?? defaultPeriod.periodEnd,
      paidAt: payment?.paidAt.slice(0, 10) ?? today,
      paymentMethod: payment?.paymentMethod ?? 'transfer', amount: payment?.amount ?? 0, currency: payment?.currency ?? 'ARS',
    },
  });
  const selectedPlan = payment?.planVersionId ? String(payment.planVersionId) : 'custom';
  const choices = payment && !plans.some((plan) => plan.value === selectedPlan)
    ? [{ value: selectedPlan, label: payment.planLabel }, ...plans] : plans;

  async function submit(values: TenantPaymentValues) {
    if (submitting.current || saved) return;
    submitting.current = true;
    try {
      const result = await executeAsync(values);
      if (result?.serverError) return void toast.error(result.serverError);
      if (result?.validationErrors) return void toast.error('Revisá los datos del pago.');
      if (result?.data?.success) {
        setSaved(true);
        toast.success(payment ? 'Pago actualizado' : 'Pago registrado');
        startRefresh(() => router.refresh());
        onClose();
      }
    } catch {
      toast.error('No se pudo guardar el pago. Intentá nuevamente.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{payment ? 'Editar pago' : 'Registrar pago'}</DialogTitle>
          <DialogDescription>Registro manual. No modifica el plan, el acceso ni la fecha de control del tenant.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
            <FormField control={form.control} name="planSelection" render={({ field }) => (
              <FormItem><FormLabel>Plan abonado</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                <FormControl><SelectTrigger><SelectValue placeholder="Seleccioná el plan abonado" /></SelectTrigger></FormControl>
                <SelectContent>{choices.map((plan) => <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>)}</SelectContent>
              </Select><FormMessage /></FormItem>
            )} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="periodStart" render={({ field }) => (
                <FormItem><FormLabel>Período desde</FormLabel><FormControl><Input type="date" {...field} disabled={busy} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="periodEnd" render={({ field }) => (
                <FormItem><FormLabel>Período hasta</FormLabel><FormControl><Input type="date" {...field} disabled={busy} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paidAt" render={({ field }) => (
                <FormItem><FormLabel>Fecha de pago</FormLabel><FormControl><Input type="date" {...field} disabled={busy} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                <FormItem><FormLabel>Método</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="transfer">Transferencia</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Monto</FormLabel><FormControl><Input type="number" min="0.01" max="999999999.99" step="0.01" inputMode="decimal" {...field} value={Number.isNaN(field.value) ? '' : field.value || ''} onChange={(event) => field.onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))} disabled={busy} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem><FormLabel>Moneda</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={busy}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="ARS">Pesos argentinos (ARS)</SelectItem><SelectItem value="USD">Dólares (USD)</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Guardando…' : payment ? 'Guardar cambios' : 'Registrar pago'}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
