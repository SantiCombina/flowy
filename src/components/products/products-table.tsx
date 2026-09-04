'use client';

import { BarChart2, ImageOff, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
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
import { DataTable, type Column } from '@/components/ui/data-table';
import { useSettings } from '@/contexts/settings-context';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { COLUMN_LABELS } from '@/lib/constants/table-columns';
import { calculatePrice } from '@/lib/money';
import { queryKeys } from '@/lib/query-keys';
import { normalizeText } from '@/lib/text';
import type { Product } from '@/payload-types';

import { deleteProductAction, getProductDemandSummaryAction } from './actions';
import { StockMovementModal } from './modals/stock-movement-modal';

const ProductDemandSheet = dynamic(() => import('./modals/product-demand-sheet').then((m) => m.ProductDemandSheet), {
  ssr: false,
});

const statusDotColumn: Column<PopulatedProductVariant> = {
  key: 'status',
  header: '',
  cell: (variant) => {
    const isActive = variant.product.isActive ?? true;
    return (
      <div className="flex justify-center">
        <div className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
      </div>
    );
  },
  className: 'w-6 pr-0',
};

interface ProductsTableProps {
  variants: PopulatedProductVariant[];
  searchQuery?: string;
  onEdit?: (productId: number) => void;
  showActions?: boolean;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
}

function ProductsTableComponent({
  variants,
  searchQuery = '',
  onEdit,
  showActions = true,
  selectable = false,
  selectedKeys,
  onSelectionChange,
}: ProductsTableProps) {
  const router = useRouter();
  const { invalidateQueries } = useInvalidateQueries();
  const { getVisibleColumns, isLoading: isSettingsLoading } = useSettings();

  const visibleColumns = useMemo(
    () => (isSettingsLoading ? [] : getVisibleColumns('products')),
    [isSettingsLoading, getVisibleColumns],
  );
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [variantForMovement, setVariantForMovement] = useState<PopulatedProductVariant | null>(null);
  const [variantForDemand, setVariantForDemand] = useState<PopulatedProductVariant | null>(null);

  const { data: demandData } = useServerActionQuery({
    queryKey: queryKeys.products.demand(),
    queryFn: () => getProductDemandSummaryAction(),
    staleTime: 5 * 60 * 1000,
    enabled: showActions,
  });

  const demandMap = demandData?.success ? demandData.demand : undefined;

  const filteredVariants = useMemo(() => {
    if (!searchQuery.trim()) return variants;
    const q = normalizeText(searchQuery);
    return variants.filter((v) => {
      const product = v.product;
      return (
        normalizeText(product.name).includes(q) ||
        normalizeText(v.code ?? '').includes(q) ||
        normalizeText(typeof product.brand === 'object' ? (product.brand?.name ?? '') : '').includes(q) ||
        normalizeText(typeof product.category === 'object' ? (product.category?.name ?? '') : '').includes(q) ||
        normalizeText(typeof product.quality === 'object' ? (product.quality?.name ?? '') : '').includes(q)
      );
    });
  }, [variants, searchQuery]);

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
      toast.warning('Producto eliminado');
    }
  };

  const shouldShowColumn = useCallback(
    (columnKey: string) => {
      return visibleColumns.includes(columnKey);
    },
    [visibleColumns],
  );

  const allColumns = useMemo<Record<string, Column<PopulatedProductVariant>>>(
    () => ({
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
                  sizes="40px"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                  <ImageOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        },
        className: 'w-16 min-w-16',
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
        className: 'w-px',
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
        className: 'w-px text-right',
      },
      price: {
        key: 'price',
        header: COLUMN_LABELS.price,
        sortable: true,
        sortValue: (v) => calculatePrice(v.costPrice, v.profitMargin ?? 0),
        cell: (variant) => {
          const suggestedPrice = calculatePrice(variant.costPrice, variant.profitMargin ?? 0);
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
        className: 'w-px text-right',
      },
      lastSold: {
        key: 'lastSold',
        header: COLUMN_LABELS.lastSold,
        sortable: true,
        sortValue: (v) => demandMap?.[v.id]?.lastSoldAt ?? '',
        cell: (variant) => {
          const lastSoldAt = demandMap?.[variant.id]?.lastSoldAt;
          if (!lastSoldAt) {
            return demandMap === undefined ? (
              <span className="text-muted-foreground text-sm">—</span>
            ) : (
              <span className="text-muted-foreground text-sm">Sin ventas</span>
            );
          }
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
        className: 'w-px',
      },
    }),
    [demandMap],
  );

  const actionsColumn = useMemo<Column<PopulatedProductVariant>>(
    () => ({
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
    }),
    [onEdit, router],
  );

  const columns = useMemo<Column<PopulatedProductVariant>[]>(
    () => [
      statusDotColumn,
      ...Object.entries(allColumns)
        .filter(([key]) => shouldShowColumn(key))
        .map(([, column]) => column),
      ...(showActions ? [actionsColumn] : []),
    ],
    [allColumns, shouldShowColumn, showActions, actionsColumn],
  );

  const keyExtractor = useCallback((v: PopulatedProductVariant) => `${v.id}-${v.product.id}`, []);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredVariants}
        keyExtractor={keyExtractor}
        isLoading={isSettingsLoading}
        emptyMessage={searchQuery ? 'No se encontraron productos' : 'No hay productos'}
        selectable={selectable}
        selectedKeys={selectedKeys}
        onSelectionChange={onSelectionChange}
        hasSelection={selectedKeys ? selectedKeys.size > 0 : false}
      />

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
        onSuccess={() => invalidateQueries([queryKeys.products.list('', 1)])}
      />

      <ProductDemandSheet variant={variantForDemand} onClose={() => setVariantForDemand(null)} />
    </>
  );
}

export const ProductsTable = memo(ProductsTableComponent);
