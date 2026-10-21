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

import { cancelInvitationAction } from './actions';

interface CancelInvitationDialogProps {
  invitation: InvitationRow | null;
  onClose(): void;
}

export function CancelInvitationDialog({ invitation, onClose }: CancelInvitationDialogProps) {
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();
  const { executeAsync, isExecuting } = useAction(cancelInvitationAction);
  const submitting = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const busy = isExecuting || isRefreshing;

  async function handleCancel() {
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
        toast.success('Invitación cancelada');
        await invalidateQueries([queryKeys.adminBackoffice.invitations.list()]);
        router.refresh();
        onClose();
      }
    } catch {
      toast.error('No se pudo cancelar la invitación. Intentá nuevamente.');
    } finally {
      submitting.current = false;
      setIsRefreshing(false);
    }
  }

  return (
    <AlertDialog open={invitation !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar invitación</AlertDialogTitle>
          <AlertDialogDescription>
            El enlace enviado a {invitation?.email} dejará de funcionar. La invitación se conservará en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Volver</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={handleCancel}>
            {busy ? 'Cancelando…' : 'Cancelar invitación'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
