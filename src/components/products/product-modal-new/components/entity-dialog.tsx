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
import { Input } from '@/components/ui/input';

import type { EntityDialogState, EntityType } from '../types';

interface EntityDialogProps {
  entityDialog: EntityDialogState;
  entityName: string;
  onEntityNameChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  getEntityLabel: (type: EntityType) => string;
  isExecuting?: boolean;
}

export function EntityDialog({
  entityDialog,
  entityName,
  onEntityNameChange,
  onClose,
  onSave,
  getEntityLabel,
  isExecuting = false,
}: EntityDialogProps) {
  return (
    <AlertDialog open={entityDialog.isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {entityDialog.mode === 'create' ? 'Crear' : 'Editar'}{' '}
            {entityDialog.type && getEntityLabel(entityDialog.type)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {entityDialog.mode === 'create'
              ? `Ingresa el nombre de la nueva ${entityDialog.type && getEntityLabel(entityDialog.type)}.`
              : `Modifica el nombre de la ${entityDialog.type && getEntityLabel(entityDialog.type)}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Input
            value={entityName}
            onChange={(e) => onEntityNameChange(e.target.value)}
            placeholder={`Nombre de ${entityDialog.type && getEntityLabel(entityDialog.type)}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSave();
              }
            }}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isExecuting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={onSave} disabled={!entityName.trim() || isExecuting}>
            {isExecuting ? 'Guardando...' : entityDialog.mode === 'create' ? 'Crear' : 'Guardar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
