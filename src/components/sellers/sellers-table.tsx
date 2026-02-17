'use client';

import { CheckCircle2, MoreVertical, Pencil, Trash2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import type { User } from '@/payload-types';

import { deleteSellerAction } from './actions';

interface SellersTableProps {
  sellers: User[];
  onEdit?: (seller: User) => void;
}

export function SellersTable({ sellers, onEdit }: SellersTableProps) {
  const router = useRouter();
  const [sellerToDelete, setSellerToDelete] = useState<User | null>(null);

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

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Nombre',
      cell: (seller) => <div className="font-medium">{seller.name}</div>,
    },
    {
      key: 'email',
      header: 'Email',
      cell: (seller) => <div className="text-muted-foreground">{seller.email}</div>,
    },
    {
      key: 'isActive',
      header: 'Estado',
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
    {
      key: 'createdAt',
      header: 'Fecha de registro',
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
    {
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
    },
  ];

  return (
    <>
      <DataTable<User>
        data={sellers}
        columns={columns}
        keyExtractor={(seller) => seller.id}
        emptyMessage="No hay vendedores registrados aún"
        page={1}
        totalPages={1}
        onPageChange={handlePageChange}
        itemsPerPage={sellers.length || 10}
        totalItems={sellers.length}
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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
