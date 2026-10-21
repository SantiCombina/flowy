'use client';

import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { TenantPaymentRow } from '@/app/services/backoffice/tenant-payments';
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
import { formatPaymentDate } from '@/lib/tenant-payment-values';

import { deleteTenantPaymentAction } from './actions';

interface DeletePaymentDialogProps {
  ownerId: number;
  payment: TenantPaymentRow;
  onClose(): void;
}

export function DeletePaymentDialog({ ownerId, payment, onClose }: DeletePaymentDialogProps) {
  const router = useRouter();
  const submitting = useRef(false);
  const [deleted, setDeleted] = useState(false);
  const { executeAsync, isExecuting } = useAction(deleteTenantPaymentAction);
  const busy = isExecuting || deleted;

  async function remove() {
    if (submitting.current || deleted) return;
    submitting.current = true;
    try {
      const result = await executeAsync({ ownerId, paymentId: payment.id });
      if (result?.serverError) return void toast.error(result.serverError);
      if (result?.validationErrors) return void toast.error('El pago no es válido.');
      if (result?.data?.success) {
        setDeleted(true);
        toast.success('Pago eliminado');
        router.refresh();
        onClose();
      }
    } catch {
      toast.error('No se pudo eliminar el pago. Intentá nuevamente.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar pago</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará definitivamente el pago de {payment.planLabel} del {formatPaymentDate(payment.paidAt)} por{' '}
            {payment.currency}{' '}
            {new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
              payment.amount,
            )}
            . Esta acción no se puede deshacer y no modifica el plan ni el acceso del tenant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy ? 'Eliminando…' : 'Eliminar pago'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
