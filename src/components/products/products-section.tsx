'use client';

import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { DollarSign, EyeOff, Eye, Plus, RotateCcw, Search, Warehouse, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
import { PageHeader } from '@/components/layout/page-header';
import { useUserOptional } from '@/components/providers/user-provider';
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
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import type { Brand, Category, Presentation, Quality } from '@/payload-types';

import { getVariantsAction, getReferenceDataAction, bulkToggleProductsAction } from './actions';
import { BulkPriceSheet } from './bulk-price-sheet';
import { ProductModal } from './product-modal-new/index';
import { ProductsTable } from './products-table';

interface RefData {
  brands: Brand[];
  categories: Category[];
  qualities: Quality[];
  presentations: Presentation[];
}

interface Props {
  initialRefData: RefData;
  initialVariants: {
    docs: PopulatedProductVariant[];
    totalDocs: number;
    totalPages: number;
    page: number;
  };
}

export function ProductsSection({ initialRefData, initialVariants }: Props) {
  const user = useUserOptional();
  const canCreateProduct = user?.role === 'owner' || user?.role === 'admin';
  const { invalidateQueries } = useInvalidateQueries();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | undefined>();
  const [referenceData, setReferenceData] = useState<RefData>(initialRefData);

  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [bulkPriceKey, setBulkPriceKey] = useState(0);
  const [bulkToggleTarget, setBulkToggleTarget] = useState<boolean | null>(null);

  const isFirstPageNoSearch = page === 1 && !searchQuery;
  const queryClient = useQueryClient();

  const {
    data: queryData,
    isPending,
    isError,
  } = useServerActionQuery({
    queryKey: queryKeys.products.list(searchQuery, page),
    queryFn: () =>
      getVariantsAction({
        filters: searchQuery ? { search: searchQuery } : undefined,
        options: { limit: 50, page, sort: 'product' },
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const queryError = isError ? 'Error al cargar productos' : null;

  const displayData = useMemo(() => {
    if (queryData?.docs && queryData.docs.length > 0) return queryData;
    if (isFirstPageNoSearch) return { success: true as const, ...initialVariants };
    return queryData ?? { success: true as const, docs: [], totalDocs: 0, totalPages: 1, page: 1 };
  }, [queryData, isFirstPageNoSearch, initialVariants]);

  const variants = displayData.docs;
  const totalDocs = displayData.totalDocs;
  const totalPages = displayData.totalPages;
  const inventoryValue = variants.reduce((sum, v) => sum + v.stock * v.costPrice, 0);

  const handleRefetch = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.list(searchQuery, page) });
    } catch {
      toast.error('Error al actualizar productos');
    }
  }, [queryClient, searchQuery, page]);

  const { executeAsync: executeToggle, isExecuting: isToggling } = useAction(bulkToggleProductsAction);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const selectedVariants = useMemo(
    () => variants.filter((v) => selectedKeys.has(`${v.id}-${v.product.id}`)),
    [variants, selectedKeys],
  );

  const uniqueProductIds = useMemo(() => [...new Set(selectedVariants.map((v) => v.product.id))], [selectedVariants]);

  const handleRefreshEntities = useCallback(async () => {
    const result = await getReferenceDataAction();
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    if (result?.data?.success) {
      setReferenceData({
        brands: result.data.brands,
        categories: result.data.categories,
        qualities: result.data.qualities,
        presentations: result.data.presentations,
      });
      toast.success('Datos de referencia actualizados');
    }
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProductId(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (productId: number) => {
    setEditingProductId(productId);
    setIsModalOpen(true);
  };

  const handleSuccess = useCallback(() => {
    invalidateQueries([queryKeys.products.list('', 1)]);
  }, [invalidateQueries]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProductId(undefined);
  };

  const handleBulkPriceSuccess = useCallback(() => {
    setSelectedKeys(new Set());
    invalidateQueries([queryKeys.products.list('', 1)]);
  }, [invalidateQueries]);

  const handleBulkToggleConfirm = async () => {
    if (bulkToggleTarget === null || uniqueProductIds.length === 0) return;

    const result = await executeToggle({
      productIds: uniqueProductIds,
      isActive: bulkToggleTarget,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      const label = bulkToggleTarget ? 'activados' : 'pausados';
      toast.warning(`${result.data.updated} productos ${label}`);
      setSelectedKeys(new Set());
      setBulkToggleTarget(null);
      invalidateQueries([queryKeys.products.list('', 1)]);
    } else {
      toast.error('No se pudo actualizar el estado de los productos');
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Productos"
        description="Gestión del catálogo de productos"
        actions={
          <div className="flex items-center gap-2 pt-1">
            {canCreateProduct && !isPending && totalDocs > 0 && (
              <div
                className="hidden sm:flex h-9 items-center gap-2 rounded-full bg-white px-4 shadow-sm"
                title="Valor del inventario (página actual)"
              >
                <Warehouse className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                <span className="text-sm font-semibold text-foreground">
                  $ {inventoryValue.toLocaleString('es-AR')}
                </span>
              </div>
            )}
            {canCreateProduct && (
              <Button onClick={handleOpenCreateModal}>
                <Plus className="h-4 w-4" />
                Nuevo producto
              </Button>
            )}
          </div>
        }
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, código, marca..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="ml-auto">
            <ColumnVisibilityDropdown tableName="products" />
          </div>
        </div>

        {queryError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span className="flex-1">{queryError}</span>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-destructive" onClick={handleRefetch}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reintentar
            </Button>
          </div>
        )}

        <ProductsTable
          variants={variants}
          totalDocs={totalDocs}
          totalPages={totalPages}
          currentPage={page}
          onPageChange={setPage}
          onEdit={canCreateProduct ? handleOpenEditModal : undefined}
          showActions={canCreateProduct}
          selectable={canCreateProduct}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          isLoading={isPending && variants.length === 0}
        />
      </main>

      {canCreateProduct && (
        <div
          className={[
            'fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md px-4 py-3',
            'sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:right-auto sm:border sm:rounded-full sm:border-border/50 sm:px-2 sm:py-2 sm:bg-background/90 sm:shadow-2xl',
            'transition-all duration-200 ease-out',
            selectedKeys.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
          ].join(' ')}
        >
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              {selectedKeys.size} seleccionadas
            </span>
            <div className="h-5 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setBulkPriceKey((k) => k + 1);
                setIsBulkPriceOpen(true);
              }}
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Editar precios</span>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setBulkToggleTarget(false)}>
              <EyeOff className="h-4 w-4" />
              <span className="hidden sm:inline">Pausar</span>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setBulkToggleTarget(true)}>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Activar</span>
            </Button>
            <div className="h-5 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setSelectedKeys(new Set())}
              aria-label="Deseleccionar todo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        productId={editingProductId}
        brands={referenceData.brands}
        categories={referenceData.categories}
        qualities={referenceData.qualities}
        presentations={referenceData.presentations}
        onRefreshEntities={handleRefreshEntities}
      />

      <BulkPriceSheet
        key={bulkPriceKey}
        isOpen={isBulkPriceOpen}
        onClose={() => setIsBulkPriceOpen(false)}
        variants={selectedVariants}
        onSuccess={handleBulkPriceSuccess}
      />

      <AlertDialog open={bulkToggleTarget !== null} onOpenChange={(open) => !open && setBulkToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkToggleTarget ? '¿Activar productos?' : '¿Pausar productos?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkToggleTarget
                ? `Se van a activar ${uniqueProductIds.length} producto${uniqueProductIds.length !== 1 ? 's' : ''} (de ${selectedKeys.size} variante${selectedKeys.size !== 1 ? 's' : ''} seleccionada${selectedKeys.size !== 1 ? 's' : ''}).`
                : `Se van a pausar ${uniqueProductIds.length} producto${uniqueProductIds.length !== 1 ? 's' : ''} (de ${selectedKeys.size} variante${selectedKeys.size !== 1 ? 's' : ''} seleccionada${selectedKeys.size !== 1 ? 's' : ''}). No aparecerán en las ventas.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkToggleConfirm} disabled={isToggling}>
              {isToggling ? 'Procesando...' : bulkToggleTarget ? 'Activar' : 'Pausar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
