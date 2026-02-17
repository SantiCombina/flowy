'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  entityName: string;
  entityLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export function DeleteConfirmationDialog({
  isOpen,
  entityName,
  entityLabel,
  onConfirm,
  onCancel,
  isExecuting = false,
}: DeleteConfirmationDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desea eliminar {entityLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            Está a punto de eliminar <span className="font-semibold">{entityName}</span>. Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isExecuting}>
            No
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isExecuting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isExecuting ? 'Eliminando...' : 'Sí'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
