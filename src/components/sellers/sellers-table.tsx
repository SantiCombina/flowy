'use client';

import { CheckCircle2, MoreVertical, Pencil, Trash2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/contexts/settings-context';
import { COLUMN_LABELS } from '@/lib/constants/table-columns';
import type { User } from '@/payload-types';

import { deleteSellerAction } from './actions';

interface SellersTableProps {
  sellers: User[];
  searchQuery?: string;
  onEdit?: (seller: User) => void;
}

export function SellersTable({ sellers, searchQuery = '', onEdit }: SellersTableProps) {
  const router = useRouter();
  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('sellers');
  const [sellerToDelete, setSellerToDelete] = useState<User | null>(null);

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return sellers;
    const q = searchQuery.toLowerCase();
    return sellers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [sellers, searchQuery]);

  const handlePageChange = () => {
    return;
  };

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
      cell: (seller) => <div className="font-medium">{seller.name}</div>,
    },
    email: {
      key: 'email',
      header: COLUMN_LABELS.email,
      cell: (seller) => <div className="text-muted-foreground">{seller.email}</div>,
    },
    phone: {
      key: 'phone',
      header: COLUMN_LABELS.phone,
      cell: (seller) => <div className="text-muted-foreground">{seller.phone || '-'}</div>,
    },
    isActive: {
      key: 'isActive',
      header: COLUMN_LABELS.isActive,
      cell: (seller) => {
        const isActive = seller.isActive ?? true;
        return (
          <Badge variant={isActive ? 'default' : 'secondary'} className="gap-1">
            {isActive ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Activo
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Inactivo
              </>
            )}
          </Badge>
        );
      },
      className: 'w-32',
    },
    createdAt: {
      key: 'createdAt',
      header: COLUMN_LABELS.createdAt,
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(seller)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setSellerToDelete(seller)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    className: 'w-16',
  };

  const columns: Column<User>[] = [
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
        page={1}
        totalPages={1}
        onPageChange={handlePageChange}
        itemsPerPage={filteredSellers.length || 10}
        totalItems={filteredSellers.length}
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
