'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, CircleOff, ListRestart, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useRef, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { TenantDetailData } from '@/app/services/backoffice/tenants';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  changeTenantPlanSchema,
  type ChangeTenantPlanValues,
  tenantControlDateSchema,
  type TenantControlDateValues,
} from '@/schemas/backoffice/manage-tenant-schema';

import {
  changeTenantPlanAction,
  deactivateTenantAction,
  reactivateTenantAction,
  updateTenantControlDateAction,
} from './actions';

interface TenantManagementProps {
  data: TenantDetailData;
}

export function TenantManagement({ data }: TenantManagementProps) {
  const { owner, activePlan, availablePlans } = data;
  const router = useRouter();
  const [dialog, setDialog] = useState<'plan' | 'date' | 'deactivate' | 'reactivate' | 'recover' | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const submitting = useRef(false);
  const { executeAsync: changePlan, isExecuting: isChangingPlan } = useAction(changeTenantPlanAction);
  const { executeAsync: updateDate, isExecuting: isUpdatingDate } = useAction(updateTenantControlDateAction);
  const { executeAsync: deactivate, isExecuting: isDeactivating } = useAction(deactivateTenantAction);
  const { executeAsync: reactivate, isExecuting: isReactivating } = useAction(reactivateTenantAction);
  const busy = isRefreshing || isChangingPlan || isUpdatingDate || isDeactivating || isReactivating;
  const deactivated = !owner.isActive || owner.entitlementState === 'blocked';
  const plans = availablePlans.filter((plan) => plan.id !== activePlan?.id);
  const planDisabled = deactivated || owner.hasCustomPlan || plans.length === 0;
  const planDisabledReason = deactivated
    ? 'No se puede cambiar el plan de un tenant desactivado o bloqueado.'
    : owner.hasCustomPlan
      ? 'Los planes personalizados se administran desde su flujo específico.'
      : plans.length === 0
        ? 'No hay otra versión de plan publicada disponible.'
        : undefined;
  const planForm = useForm<ChangeTenantPlanValues>({
    resolver: zodResolver(changeTenantPlanSchema),
    defaultValues: { id: owner.id, planVersionId: 0 },
  });
  const dateForm = useForm<TenantControlDateValues>({
    resolver: zodResolver(tenantControlDateSchema),
    defaultValues: { id: owner.id, planControlDate: owner.planControlDate?.slice(0, 10) ?? '' },
  });

  function complete(message: string) {
    toast.success(message);
    setDialog(null);
    startRefresh(() => router.refresh());
  }

  async function submitPlan(values: ChangeTenantPlanValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await changePlan(values);
      if (result?.serverError) return void toast.error(result.serverError);
      if (result?.validationErrors) return void toast.error('Revisá el plan seleccionado.');
      if (result?.data?.success) complete('Plan actualizado');
    } catch {
      toast.error('No se pudo actualizar el plan. Intentá nuevamente.');
    } finally {
      submitting.current = false;
    }
  }

  async function submitDate(values: TenantControlDateValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await updateDate(values);
      if (result?.serverError) return void toast.error(result.serverError);
      if (result?.validationErrors) return void toast.error('Revisá la fecha ingresada.');
      if (result?.data?.success) complete('Fecha de control actualizada');
    } catch {
      toast.error('No se pudo actualizar la fecha. Intentá nuevamente.');
    } finally {
      submitting.current = false;
    }
  }

  async function submitDeactivation() {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await deactivate({ id: owner.id });
      if (result?.serverError) return void toast.error(result.serverError);
      if (result?.validationErrors) return void toast.error('El tenant no es válido.');
      if (result?.data?.success) complete('Tenant desactivado');
    } catch {
      toast.error('No se pudo desactivar el tenant. Intentá nuevamente.');
    } finally {
      submitting.current = false;
    }
  }

  async function submitReactivation(recoveryConfirmed: boolean) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      const result = await reactivate({ id: owner.id, recoveryConfirmed });
      if (result?.serverError) return void toast.error(result.serverError);
      if (result?.validationErrors) return void toast.error('El tenant no es válido.');
      if (result?.data?.requiresRecovery) {
        setDialog('recover');
        return;
      }
      if (result?.data?.success && !result.data.requiresRecovery) {
        const state = result.data.entitlementState;
        complete(
          recoveryConfirmed
            ? 'Acceso restaurado. El tenant queda en preparación; el plan no se activó.'
            : state === 'provisioning'
              ? 'Tenant reactivado en preparación. La activación del plan es independiente.'
              : 'Tenant reactivado',
        );
      }
    } catch {
      toast.error('No se pudo reactivar el tenant. Intentá nuevamente.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || planDisabled}
            title={planDisabledReason}
            onClick={() => {
              planForm.reset({ id: owner.id, planVersionId: 0 });
              setDialog('plan');
            }}
          >
            <ListRestart className="h-4 w-4" />
            {activePlan || owner.hasCustomPlan ? 'Cambiar plan' : 'Asignar plan'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              dateForm.reset({ id: owner.id, planControlDate: owner.planControlDate?.slice(0, 10) ?? '' });
              setDialog('date');
            }}
          >
            <CalendarDays className="h-4 w-4" />
            Fecha de control
          </Button>
          {deactivated ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setDialog('reactivate')}>
              <RotateCcw className="h-4 w-4" />
              Reactivar tenant
            </Button>
          ) : (
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => setDialog('deactivate')}>
              <CircleOff className="h-4 w-4" />
              Dar de baja
            </Button>
          )}
        </div>
        {planDisabledReason && (
          <p className="max-w-sm text-xs text-muted-foreground sm:text-right">{planDisabledReason}</p>
        )}
      </div>

      <Dialog
        open={dialog === 'plan'}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activePlan ? 'Cambiar plan' : 'Asignar plan'}</DialogTitle>
            <DialogDescription>
              Se conserva el historial de asignaciones. El cambio no activa tenants en preparación.
            </DialogDescription>
          </DialogHeader>
          <Form {...planForm}>
            <form onSubmit={(event) => planForm.handleSubmit(submitPlan)(event)} className="space-y-4">
              <FormField
                control={planForm.control}
                name="planVersionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(value) => field.onChange(Number(value))}
                      disabled={busy}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná un plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setDialog(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar plan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === 'date'}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fecha de control del plan</DialogTitle>
            <DialogDescription>
              Es solo informativa: no vence el plan ni bloquea el acceso. Dejá el campo vacío para quitarla.
            </DialogDescription>
          </DialogHeader>
          <Form {...dateForm}>
            <form onSubmit={(event) => dateForm.handleSubmit(submitDate)(event)} className="space-y-4">
              <FormField
                control={dateForm.control}
                name="planControlDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de control</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={busy} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setDialog(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Guardando…' : 'Guardar fecha'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={dialog === 'reactivate'}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivar a {owner.businessName?.trim() || owner.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Se revierte la baja sin modificar los datos ni las configuraciones individuales de los vendedores. Se
              restaura el estado previo del plan cuando hay un registro confiable y la asignación no cambió. Si hace
              falta recuperar el acceso manualmente, se solicitará una confirmación adicional antes de realizar cambios.
              Esta acción no activa planes pendientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button disabled={busy} onClick={() => submitReactivation(false)}>
              {busy ? 'Reactivando…' : 'Reactivar tenant'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === 'recover'}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar acceso manualmente</AlertDialogTitle>
            <AlertDialogDescription>
              No se puede restaurar automáticamente un estado previo con acceso habilitado. No se realizaron cambios. Al
              confirmar, se habilitará el acceso del owner y de sus vendedores que sigan habilitados, y el tenant
              quedará en preparación. Si no tiene un snapshot de plan asignado, se aplicarán los permisos heredados de
              cada rol, que pueden ser amplios. Esta recuperación revierte el bloqueo de acceso, pero no activa un plan
              administrado ni reemplaza su proceso de validación. Los datos se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button disabled={busy} onClick={() => submitReactivation(true)}>
              {busy ? 'Restaurando…' : 'Confirmar y restaurar acceso'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === 'deactivate'}
        onOpenChange={(open) => {
          if (!open && !busy) setDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dar de baja a {owner.businessName?.trim() || owner.name}</AlertDialogTitle>
            <AlertDialogDescription>
              El owner y todos sus vendedores perderán el acceso, incluso si tienen una sesión abierta. Se conservarán
              los productos, las ventas y todo el historial. Esta acción no elimina datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={submitDeactivation}>
              {busy ? 'Desactivando…' : 'Dar de baja'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
