'use client';

import { ArrowDownToLine, ArrowUpFromLine, Eye, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
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
import type { User } from '@/payload-types';

import { deleteSellerAction } from './actions';

interface SellersTableProps {
  sellers: User[];
  searchQuery?: string;
  onViewDetails?: (seller: User) => void;
  onEdit?: (seller: User) => void;
  onDispatch?: (seller: User) => void;
  onReturn?: (seller: User) => void;
}

export function SellersTable({
  sellers,
  searchQuery = '',
  onViewDetails,
  onEdit,
  onDispatch,
  onReturn,
}: SellersTableProps) {
  const router = useRouter();
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('sellers');
  const [sellerToDelete, setSellerToDelete] = useState<User | null>(null);

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return sellers;
    const q = searchQuery.toLowerCase();
    return sellers.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [sellers, searchQuery]);

  const handleDelete = async () => {
    if (!sellerToDelete) return;

    const result = await deleteSellerAction({ id: sellerToDelete.id });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Vendedor eliminado correctamente');
      router.refresh();
    } else {
      toast.error('Error al eliminar vendedor');
    }

    setSellerToDelete(null);
  };

  const allColumns: Record<string, Column<User>> = {
    name: {
      key: 'name',
      header: COLUMN_LABELS.name,
      sortable: true,
      sortValue: (s) => s.name,
      cell: (seller) => <div className="font-medium">{seller.name}</div>,
    },
    email: {
      key: 'email',
      header: COLUMN_LABELS.email,
      sortable: true,
      sortValue: (s) => s.email,
      cell: (seller) => <div className="text-muted-foreground">{seller.email}</div>,
    },
    phone: {
      key: 'phone',
      header: COLUMN_LABELS.phone,
      sortable: true,
      sortValue: (s) => s.phone ?? '',
      cell: (seller) => <div className="text-muted-foreground">{seller.phone || '-'}</div>,
    },
    createdAt: {
      key: 'createdAt',
      header: COLUMN_LABELS.createdAt,
      sortable: true,
      sortValue: (s) => s.createdAt,
      cell: (seller) => {
        const date = new Date(seller.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {date.toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
        );
      },
      className: 'w-40',
    },
  };

  const actionsColumn: Column<User> = {
    key: 'actions',
    header: '',
    cell: (seller) => (
      <ActionMenu
        items={[
          { label: 'Ver detalles', icon: Eye, onClick: () => onViewDetails?.(seller) },
          { label: 'Despachar stock', icon: ArrowDownToLine, onClick: () => onDispatch?.(seller) },
          { label: 'Devolver stock', icon: ArrowUpFromLine, onClick: () => onReturn?.(seller) },
          { label: 'Editar', icon: Pencil, onClick: () => onEdit?.(seller), separator: true },
          { label: 'Eliminar', icon: Trash2, onClick: () => setSellerToDelete(seller), variant: 'destructive' },
        ]}
      />
    ),
    className: 'w-16',
  };

  const statusDotColumn: Column<User> = {
    key: 'status',
    header: '',
    cell: (seller) => {
      const isActive = seller.isActive ?? true;
      return (
        <div className="flex justify-center">
          <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      );
    },
    className: 'w-6 pr-0',
  };

  const columns: Column<User>[] = [
    statusDotColumn,
    ...Object.entries(allColumns)
      .filter(([key]) => visibleColumns.includes(key))
      .map(([, col]) => col),
    actionsColumn,
  ];

  return (
    <>
      <DataTable<User>
        data={filteredSellers}
        columns={columns}
        keyExtractor={(seller) => seller.id}
        emptyMessage={searchQuery ? 'No se encontraron vendedores' : 'No hay vendedores registrados aún'}
      />

      <AlertDialog open={!!sellerToDelete} onOpenChange={() => setSellerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
              <span className="font-semibold">{sellerToDelete?.name}</span>.
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
