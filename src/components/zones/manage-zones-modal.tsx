'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ActionMenu } from '@/components/ui/action-menu';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import type { Zone } from '@/payload-types';

import { createZoneAction, deleteZoneAction, getZonesAction, updateZoneAction } from './actions';

interface ManageZonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onZonesChanged: () => void;
}

// Handler para cerrar el modal y resetear el estado
export function ManageZonesModal({ isOpen, onClose, onZonesChanged }: ManageZonesModalProps) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newZoneName, setNewZoneName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);

  const { executeAsync: execGetZones } = useAction(getZonesAction);
  const { executeAsync: execCreateZone } = useAction(createZoneAction);
  const { executeAsync: execUpdateZone } = useAction(updateZoneAction);
  const { executeAsync: execDeleteZone } = useAction(deleteZoneAction);

  const handleClose = () => {
    setEditingId(null);
    setEditingName('');
    setNewZoneName('');
    setIsAdding(false);
    onClose();
  };

  const loadZones = async () => {
    setLoading(true);
    try {
      const result = await execGetZones();
      if (result?.data?.success) {
        setZones(result.data.zones as Zone[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setEditingId(null);
    setEditingName('');
    setNewZoneName('');
    setIsAdding(false);
    onClose();
  };

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      void loadZones();
    }
    if (!isOpen) {
      hasLoadedRef.current = false;
    }
  }, [isOpen]);

  const handleCreate = async () => {
    const name = newZoneName.trim();
    if (!name) return;

    const result = await execCreateZone({ name });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success && result.data.zone) {
      const newZone = result.data.zone as Zone;
      setZones((prev) => [...prev, newZone]);
      setNewZoneName('');
      setIsAdding(false);
      onZonesChanged();
      toast.success(`Zona "${name}" creada`);
    }
  };

  const handleUpdate = async (id: number) => {
    const name = editingName.trim();
    if (!name) return;

    const result = await execUpdateZone({ id, name });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success && result.data.zone) {
      const updated = result.data.zone as Zone;
      setZones((prev) => prev.map((z) => (z.id === id ? updated : z)));
      setEditingId(null);
      setEditingName('');
      onZonesChanged();
      toast.success('Zona actualizada');
    }
  };

  const handleDelete = async (id: number) => {
    const result = await execDeleteZone({ id });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      setZones((prev) => prev.filter((z) => z.id !== id));
      onZonesChanged();
      toast.success('Zona eliminada');
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleModalClose} className="sm:max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Gestionar zonas</ResponsiveModalTitle>
      </ResponsiveModalHeader>

      <ResponsiveModalBody className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        ) : zones.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay zonas creadas. Agregá la primera.</p>
        ) : (
          <div className="space-y-1.5">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
              >
                {editingId === zone.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleUpdate(zone.id);
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingName('');
                        }
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleUpdate(zone.id)}
                      disabled={!editingName.trim()}
                    >
                      Guardar
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 truncate text-sm">{zone.name}</div>
                    <ActionMenu
                      items={[
                        {
                          label: 'Editar',
                          icon: Pencil,
                          onClick: () => {
                            setEditingId(zone.id);
                            setEditingName(zone.name);
                          },
                        },
                        {
                          label: 'Eliminar',
                          icon: Trash2,
                          onClick: () => setZoneToDelete(zone),
                          variant: 'destructive',
                        },
                      ]}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nombre de la zona"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreate();
                }
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewZoneName('');
                }
              }}
              autoFocus
            />
            <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={!newZoneName.trim()}>
              Crear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewZoneName('');
              }}
            >
              Cancelar
            </Button>
          </div>
        )}
      </ResponsiveModalBody>

      <ResponsiveModalFooter>
        {!isAdding && (
          <Button type="button" variant="outline" onClick={() => setIsAdding(true)} className="w-full">
            <Plus className="h-4 w-4" />
            Agregar zona
          </Button>
        )}
      </ResponsiveModalFooter>

      <AlertDialog open={!!zoneToDelete} onOpenChange={() => setZoneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar zona?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los clientes asignados a{' '}
              <span className="font-semibold">{zoneToDelete?.name}</span> quedarán sin zona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => zoneToDelete && void handleDelete(zoneToDelete.id)} variant="destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ResponsiveModal>
  );
}
