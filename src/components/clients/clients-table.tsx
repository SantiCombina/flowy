'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { DataTable, type Column } from '@/components/ui/data-table';
import { useSettings } from '@/contexts/settings-context';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { COLUMN_LABELS } from '@/lib/constants/table-columns';
import { queryKeys } from '@/lib/query-keys';
import { formatCurrency } from '@/lib/utils';
import type { Client, User } from '@/payload-types';

import { deleteClientAction } from './actions';
import { resolveClientActionVisibility } from './client-action-visibility';

interface ClientsTableProps {
  clients: Client[];
  clientDebts: Record<number, number>;
  searchQuery?: string;
  zones: { id: number; name: string }[];
  zoneFilter?: string;
  onZoneFilterChange?: (value: string) => void;
  localidades: string[];
  localidadFilter?: string;
  onLocalidadFilterChange?: (value: string) => void;
  provincias: string[];
  provinciaFilter?: string;
  onProvinciaFilterChange?: (value: string) => void;
  showSellerColumn?: boolean;
  showContactColumns?: boolean;
  onEdit?: (client: Client) => void;
  canDelete: boolean;
}

export function ClientsTable({
  clients,
  clientDebts,
  searchQuery = '',
  zones,
  zoneFilter = '',
  onZoneFilterChange,
  localidades,
  localidadFilter = '',
  onLocalidadFilterChange,
  provincias,
  provinciaFilter = '',
  onProvinciaFilterChange,
  showSellerColumn = false,
  showContactColumns = true,
  onEdit,
  canDelete,
}: ClientsTableProps) {
  const actionVisibility = resolveClientActionVisibility(onEdit !== undefined, canDelete);
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('clients');
  const { invalidateQueries } = useInvalidateQueries();
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    let result = clients;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const baseMatch = c.name.toLowerCase().includes(q);
        if (!showContactColumns) return baseMatch;
        return (
          baseMatch ||
          (c.localidad ?? '').toLowerCase().includes(q) ||
          (c.provincia ?? '').toLowerCase().includes(q) ||
          (c.cuit ?? '').toLowerCase().includes(q) ||
          (c.phone ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q)
        );
      });
    }
    if (zoneFilter) {
      const zoneId = Number(zoneFilter);
      result = result.filter((c) => {
        if (typeof c.zone === 'object' && c.zone) return c.zone.id === zoneId;
        if (typeof c.zone === 'number') return c.zone === zoneId;
        return false;
      });
    }
    if (localidadFilter) {
      result = result.filter((c) => c.localidad === localidadFilter);
    }
    if (provinciaFilter) {
      result = result.filter((c) => c.provincia === provinciaFilter);
    }
    return result;
  }, [clients, searchQuery, zoneFilter, localidadFilter, provinciaFilter]);

  const handleDelete = async () => {
    if (!clientToDelete) return;

    const result = await deleteClientAction({ id: clientToDelete.id });

    if (result?.serverError) {
      toast.error(result.serverError);
      setClientToDelete(null);
      return;
    }

    if (result?.data?.success) {
      toast.warning('Cliente eliminado');
      invalidateQueries([queryKeys.clients.list()]);
    }

    setClientToDelete(null);
  };

  const getSellerName = (c: Client): string => {
    if (!c.createdBy) return '-';
    if (typeof c.createdBy === 'object') return (c.createdBy as User).name ?? '-';
    return '-';
  };

  const allColumns: Record<string, Column<Client>> = {
    name: {
      key: 'name',
      header: COLUMN_LABELS.name,
      sortable: true,
      sortValue: (c) => c.name,
      cell: (c) => <div className="font-medium">{c.name}</div>,
    },
    cuit: {
      key: 'cuit',
      header: COLUMN_LABELS.cuit,
      sortable: true,
      sortValue: (c) => c.cuit ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.cuit || '-'}</div>,
      className: 'w-px',
    },
    phone: {
      key: 'phone',
      header: COLUMN_LABELS.phone,
      sortable: true,
      sortValue: (c) => c.phone ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.phone || '-'}</div>,
      className: 'w-px',
    },
    email: {
      key: 'email',
      header: COLUMN_LABELS.email,
      sortable: true,
      sortValue: (c) => c.email ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.email || '-'}</div>,
    },
    address: {
      key: 'address',
      header: COLUMN_LABELS.address,
      sortable: true,
      sortValue: (c) => c.address ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.address || '-'}</div>,
    },
    localidad: {
      key: 'localidad',
      header: COLUMN_LABELS.localidad,
      sortable: true,
      sortValue: (c) => c.localidad ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.localidad || '-'}</div>,
      className: 'w-px',
      filterOptions: [{ value: '', label: 'Todas' }, ...localidades.map((l) => ({ value: l, label: l }))],
      filterValue: localidadFilter,
      onFilterChange: onLocalidadFilterChange,
    },
    provincia: {
      key: 'provincia',
      header: COLUMN_LABELS.provincia,
      sortable: true,
      sortValue: (c) => c.provincia ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.provincia || '-'}</div>,
      className: 'w-px',
      filterOptions: [{ value: '', label: 'Todas' }, ...provincias.map((p) => ({ value: p, label: p }))],
      filterValue: provinciaFilter,
      onFilterChange: onProvinciaFilterChange,
    },
    zone: {
      key: 'zone',
      header: COLUMN_LABELS.zone,
      sortable: true,
      sortValue: (c) => (typeof c.zone === 'object' ? (c.zone?.name ?? '') : ''),
      cell: (c) => (
        <div className="text-muted-foreground">{typeof c.zone === 'object' ? (c.zone?.name ?? '-') : '-'}</div>
      ),
      className: 'w-px',
      filterOptions: [{ value: '', label: 'Todas' }, ...zones.map((z) => ({ value: String(z.id), label: z.name }))],
      filterValue: zoneFilter,
      onFilterChange: onZoneFilterChange,
    },
    debt: {
      key: 'debt',
      header: COLUMN_LABELS.debt,
      sortable: true,
      sortValue: (c) => clientDebts[c.id] ?? 0,
      cell: (c) => {
        const debt = clientDebts[c.id];
        if (!debt) return <div className="text-muted-foreground">-</div>;
        return <div className="font-medium text-destructive">{formatCurrency(debt)}</div>;
      },
    },
  };

  const sellerColumn: Column<Client> = {
    key: 'seller',
    header: COLUMN_LABELS.seller,
    sortable: true,
    sortValue: (c) => getSellerName(c),
    cell: (c) => <div className="text-muted-foreground">{getSellerName(c)}</div>,
  };

  const actionsColumn: Column<Client> = {
    key: 'actions',
    header: '',
    cell: (c) => (
      <ActionMenu
        items={[
          actionVisibility.showEdit && {
            label: 'Editar',
            icon: Pencil,
            onClick: () => onEdit?.(c),
          },
          actionVisibility.showDelete && {
            label: 'Eliminar',
            icon: Trash2,
            onClick: () => setClientToDelete(c),
            variant: 'destructive',
          },
        ]}
      />
    ),
    className: 'w-16',
  };

  const allowedKeys = new Set<string>(['name', 'debt']);
  if (showContactColumns) {
    allowedKeys.add('cuit');
    allowedKeys.add('phone');
    allowedKeys.add('email');
    allowedKeys.add('address');
    allowedKeys.add('localidad');
    allowedKeys.add('provincia');
    allowedKeys.add('zone');
  }
  if (showSellerColumn) {
    allowedKeys.add('seller');
  }

  const columns: Column<Client>[] = [
    ...Object.entries(allColumns)
      .filter(([key]) => visibleColumns.includes(key) && allowedKeys.has(key))
      .map(([, col]) => col),
    ...(showSellerColumn ? [sellerColumn] : []),
    ...(actionVisibility.showActions ? [actionsColumn] : []),
  ];

  return (
    <>
      <DataTable<Client>
        data={filteredClients}
        columns={columns}
        keyExtractor={(c) => c.id}
        emptyMessage={searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados aún'}
      />

      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
              <span className="font-semibold">{clientToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} variant="destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
