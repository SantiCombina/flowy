'use client';

import { BarChart2, ChevronLeft, ChevronRight, ImageOff, PackagePlus, Pencil, Trash2, Warehouse } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
import type { VariantDemandSummary } from '@/app/services/sales';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useSettings } from '@/contexts/settings-context';
import { COLUMN_LABELS } from '@/lib/constants/table-columns';
import type { Product } from '@/payload-types';

import { deleteProductAction, getProductDemandSummaryAction } from './actions';
import { ProductDemandSheet } from './product-demand-sheet';
import { StockMovementModal } from './stock-movement-modal';

interface ProductsTableProps {
  variants: PopulatedProductVariant[];
  totalDocs: number;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  inventoryValue: number;
  onEdit?: (productId: number) => void;
  showActions?: boolean;
  showInventoryValue?: boolean;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  isLoading?: boolean;
}

export interface ProductsTableRef {
  refresh: () => void;
}

export const ProductsTable = forwardRef<ProductsTableRef, ProductsTableProps>(
  (
    {
      variants,
      totalDocs,
      totalPages,
      currentPage,
      onPageChange,
      inventoryValue,
      onEdit,
      showActions = true,
      showInventoryValue = true,
      selectable = false,
      selectedKeys,
      onSelectionChange,
      isLoading = false,
    },
    ref,
  ) => {
    const router = useRouter();
    const { getItemsPerPage, getVisibleColumns, isLoading: isSettingsLoading, updateItemsPerPage } = useSettings();

    const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [variantForMovement, setVariantForMovement] = useState<PopulatedProductVariant | null>(null);
    const [variantForDemand, setVariantForDemand] = useState<PopulatedProductVariant | null>(null);
    const [demandMap, setDemandMap] = useState<Record<number, VariantDemandSummary>>({});

    useEffect(() => {
      if (!isSettingsLoading) {
        setVisibleColumns(getVisibleColumns('products'));
      }
    }, [isSettingsLoading, getVisibleColumns]);

    useEffect(() => {
      void getProductDemandSummaryAction().then((result) => {
        if (result?.data?.success) {
          setDemandMap(result.data.demand);
        }
      });
    }, []);

    useImperativeHandle(ref, () => ({
      refresh: () => {
        router.refresh();
      },
    }));

    const handleDelete = async () => {
      if (!productToDelete) return;
      const productId = productToDelete.id;
      setProductToDelete(null);

      const result = await deleteProductAction({ id: productId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success('Producto eliminado correctamente');
        router.refresh();
      } else {
        toast.error('Error al eliminar producto');
      }
    };

    const shouldShowColumn = useCallback(
      (columnKey: string) => {
        return visibleColumns.includes(columnKey);
      },
      [visibleColumns],
    );

    const allColumns: Record<string, Column<PopulatedProductVariant>> = {
      image: {
        key: 'image',
        header: '',
        cell: (variant) => {
          const product = variant.product;
          const image = typeof product.image === 'object' && product.image?.url ? product.image.url : null;
          return (
            <div className="flex items-center justify-center">
              {image ? (
                <Image
                  src={image}
                  alt={product.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        },
        className: 'w-16',
      },
      name: {
        key: 'name',
        header: COLUMN_LABELS.name,
        sortable: true,
        sortValue: (v) => v.product.name,
        cell: (variant) => {
          const product = variant.product;
          return <div className="font-medium">{product.name}</div>;
        },
      },
      code: {
        key: 'code',
        header: COLUMN_LABELS.code,
        sortable: true,
        sortValue: (v) => v.code ?? '',
        cell: (variant) => (
          <span className="inline-block px-2.5 py-1 rounded-md bg-muted font-mono text-sm font-medium tracking-wide text-foreground/90">
            {variant.code || '-'}
          </span>
        ),
      },
      brand: {
        key: 'brand',
        header: COLUMN_LABELS.brand,
        sortable: true,
        sortValue: (v) => (typeof v.product.brand === 'object' ? (v.product.brand?.name ?? '') : ''),
        cell: (variant) => {
          const brand = variant.product.brand;
          if (typeof brand === 'object' && brand?.name) {
            return brand.name;
          }
          return '-';
        },
      },
      category: {
        key: 'category',
        header: COLUMN_LABELS.category,
        sortable: true,
        sortValue: (v) => (typeof v.product.category === 'object' ? (v.product.category?.name ?? '') : ''),
        cell: (variant) => {
          const category = variant.product.category;
          if (typeof category === 'object' && category?.name) {
            return category.name;
          }
          return '-';
        },
      },
      quality: {
        key: 'quality',
        header: COLUMN_LABELS.quality,
        sortable: true,
        sortValue: (v) => (typeof v.product.quality === 'object' ? (v.product.quality?.name ?? '') : ''),
        cell: (variant) => {
          const quality = variant.product.quality;
          if (typeof quality === 'object' && quality?.name) {
            return quality.name;
          }
          return '-';
        },
      },
      presentation: {
        key: 'presentation',
        header: COLUMN_LABELS.presentation,
        sortable: true,
        sortValue: (v) => v.presentation?.label ?? '',
        cell: (variant) => {
          const presentation = variant.presentation;
          return <span>{presentation?.label || '-'}</span>;
        },
      },
      stock: {
        key: 'stock',
        header: COLUMN_LABELS.stock,
        sortable: true,
        sortValue: (v) => v.stock,
        cell: (variant) => (
          <Badge className="bg-white text-foreground border border-gray-200 shadow-none">{variant.stock}</Badge>
        ),
      },
      price: {
        key: 'price',
        header: COLUMN_LABELS.price,
        sortable: true,
        sortValue: (v) => v.costPrice * (1 + (v.profitMargin ?? 0) / 100),
        cell: (variant) => {
          const suggestedPrice = variant.costPrice * (1 + (variant.profitMargin ?? 0) / 100);
          const formattedPrice = suggestedPrice.toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
          return (
            <div className="text-right">
              <span>$ {formattedPrice}</span>
            </div>
          );
        },
        className: 'text-right',
      },
      lastSold: {
        key: 'lastSold',
        header: COLUMN_LABELS.lastSold,
        sortable: true,
        sortValue: (v) => demandMap[v.id]?.lastSoldAt ?? '',
        cell: (variant) => {
          const lastSoldAt = demandMap[variant.id]?.lastSoldAt;
          if (!lastSoldAt) return <span className="text-muted-foreground text-sm">Sin ventas</span>;
          return (
            <span className="text-sm">
              {new Date(lastSoldAt).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </span>
          );
        },
      },
    };

    const actionsColumn: Column<PopulatedProductVariant> = {
      key: 'actions',
      header: '',
      cell: (variant) => {
        const product = variant.product;
        return (
          <ActionMenu
            items={[
              { label: 'Registrar movimiento', icon: PackagePlus, onClick: () => setVariantForMovement(variant) },
              { label: 'Ver demanda', icon: BarChart2, onClick: () => setVariantForDemand(variant) },
              {
                label: 'Editar',
                icon: Pencil,
                onClick: () => (onEdit ? onEdit(product.id) : router.push(`/products/${product.id}/edit`)),
                separator: true,
              },
              { label: 'Eliminar', icon: Trash2, onClick: () => setProductToDelete(product), variant: 'destructive' },
            ]}
          />
        );
      },
      className: 'w-16',
    };

    const statusDotColumn: Column<PopulatedProductVariant> = {
      key: 'status',
      header: '',
      cell: (variant) => {
        const isActive = variant.product.isActive ?? true;
        return (
          <div className="flex justify-center">
            <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
        );
      },
      className: 'w-6 pr-0',
    };

    const columns: Column<PopulatedProductVariant>[] = [
      statusDotColumn,
      allColumns.image,
      ...Object.entries(allColumns)
        .filter(([key]) => key !== 'image' && shouldShowColumn(key))
        .map(([, column]) => column),
      ...(showActions ? [actionsColumn] : []),
    ];

    return (
      <>
        {!isLoading && totalDocs > 0 && showInventoryValue && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Warehouse className="h-4 w-4" />
              <span>Valor del inventario (página actual)</span>
            </div>
            <span className="font-semibold">$ {inventoryValue.toLocaleString('es-AR')}</span>
          </div>
        )}

        <DataTable
          columns={columns}
          data={variants}
          keyExtractor={(v) => `${v.id}-${v.product.id}`}
          isLoading={isLoading || isSettingsLoading}
          emptyMessage="No hay productos"
          defaultItemsPerPage={getItemsPerPage()}
          onItemsPerPageChange={(n) => void updateItemsPerPage(n as Parameters<typeof updateItemsPerPage>[0])}
          selectable={selectable}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <span>
              Página {currentPage} de {totalPages} ({totalDocs} total)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <AlertDialog open={productToDelete !== null} onOpenChange={() => setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el producto &quot;{productToDelete?.name}
                &quot; y todas sus presentaciones. Esta acción no se puede deshacer.
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

        <StockMovementModal
          isOpen={variantForMovement !== null}
          onClose={() => setVariantForMovement(null)}
          variant={variantForMovement}
          onSuccess={() => router.refresh()}
        />

        <ProductDemandSheet variant={variantForDemand} onClose={() => setVariantForDemand(null)} />
      </>
    );
  },
);

ProductsTable.displayName = 'ProductsTable';
