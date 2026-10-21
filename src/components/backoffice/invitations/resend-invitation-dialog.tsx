'use client';

import { useRouter } from 'next/navigation';
import { useAction } from 'next-safe-action/hooks';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { InvitationRow } from '@/app/services/backoffice/invitations';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { queryKeys } from '@/lib/query-keys';

import { resendInvitationAction } from './actions';

interface ResendInvitationDialogProps {
  invitation: InvitationRow | null;
  onClose(): void;
}

export function ResendInvitationDialog({ invitation, onClose }: ResendInvitationDialogProps) {
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();
  const { executeAsync, isExecuting } = useAction(resendInvitationAction);
  const submitting = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const busy = isExecuting || isRefreshing;

  async function handleResend() {
    if (!invitation || submitting.current) return;
    submitting.current = true;
    try {
      const result = await executeAsync({ id: invitation.id });
      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }
      if (result?.validationErrors) {
        toast.error('La invitación no es válida');
        return;
      }
      if (result?.data?.success) {
        setIsRefreshing(true);
        if (result.data.emailSent) {
          toast.success('Invitación reenviada. El nuevo enlace tiene una vigencia de 7 días.');
        } else {
          toast.warning('Se creó un nuevo enlace, pero falló el envío. Reintentá desde la nueva invitación pendiente.');
        }
        if (!result.data.emailStatusSaved) {
          toast.warning('No se pudo guardar el estado del envío en el listado.');
        }
        onClose();
        await invalidateQueries([queryKeys.adminBackoffice.invitations.list()]);
        router.refresh();
      }
    } catch {
      toast.error('No se pudo completar la operación. Actualizá el listado antes de reintentar.');
      router.refresh();
    } finally {
      submitting.current = false;
      setIsRefreshing(false);
    }
  }

  return (
    <AlertDialog open={invitation !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reenviar invitación</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará un nuevo enlace a {invitation?.email}, válido por 7 días desde su creación.
            El enlace anterior dejará de funcionar y la invitación se conservará en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Volver</AlertDialogCancel>
          <Button disabled={busy} onClick={handleResend}>{busy ? 'Reenviando…' : 'Reenviar invitación'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
