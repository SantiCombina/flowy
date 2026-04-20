'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { COLUMN_LABELS } from '@/lib/constants/table-columns';
import type { Client, User } from '@/payload-types';

import { deleteClientAction } from './actions';

interface ClientsTableProps {
  clients: Client[];
  searchQuery?: string;
  showSellerColumn?: boolean;
  onEdit?: (client: Client) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (n: number) => void;
}

export function ClientsTable({
  clients,
  searchQuery = '',
  showSellerColumn = false,
  onEdit,
  itemsPerPage = 10,
  onItemsPerPageChange,
}: ClientsTableProps) {
  const router = useRouter();
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('clients');
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.localidad ?? '').toLowerCase().includes(q) ||
        (c.provincia ?? '').toLowerCase().includes(q) ||
        (c.cuit ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  const handleDelete = async () => {
    if (!clientToDelete) return;

    const result = await deleteClientAction({ id: clientToDelete.id });

    if (result?.serverError) {
      toast.error(result.serverError);
      setClientToDelete(null);
      return;
    }

    if (result?.data?.success) {
      toast.success('Cliente eliminado correctamente');
      router.refresh();
    } else {
      toast.error('Error al eliminar el cliente');
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
    },
    provincia: {
      key: 'provincia',
      header: COLUMN_LABELS.provincia,
      sortable: true,
      sortValue: (c) => c.provincia ?? '',
      cell: (c) => <div className="text-muted-foreground">{c.provincia || '-'}</div>,
      className: 'w-px',
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
          { label: 'Editar', icon: Pencil, onClick: () => onEdit?.(c) },
          { label: 'Eliminar', icon: Trash2, onClick: () => setClientToDelete(c), variant: 'destructive' },
        ]}
      />
    ),
    className: 'w-16',
  };

  const columns: Column<Client>[] = [
    ...Object.entries(allColumns)
      .filter(([key]) => visibleColumns.includes(key))
      .map(([, col]) => col),
    ...(showSellerColumn ? [sellerColumn] : []),
    actionsColumn,
  ];

  return (
    <>
      <DataTable<Client>
        data={filteredClients}
        columns={columns}
        keyExtractor={(c) => c.id}
        emptyMessage={searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados aún'}
        defaultItemsPerPage={itemsPerPage}
        onItemsPerPageChange={onItemsPerPageChange}
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
