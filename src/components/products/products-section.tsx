'use client';

import { DollarSign, EyeOff, Eye, Plus, Search, Warehouse, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import type { Brand, Category, Presentation, Quality } from '@/payload-types';

import { getVariantsAction, getReferenceDataAction, bulkToggleProductsAction } from './actions';
import { BulkPriceSheet } from './bulk-price-sheet';
import { ProductModal } from './product-modal-new/index';
import { ProductsTable, type ProductsTableRef } from './products-table';

interface RefData {
  brands: Brand[];
  categories: Category[];
  qualities: Quality[];
  presentations: Presentation[];
}

interface Props {
  initialRefData: RefData;
}

export function ProductsSection({ initialRefData }: Props) {
  const user = useUserOptional();
  const canCreateProduct = user?.role === 'owner' || user?.role === 'admin';
  const tableRef = useRef<ProductsTableRef>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | undefined>();
  const [referenceData, setReferenceData] = useState<RefData>(initialRefData);

  const [variants, setVariants] = useState<PopulatedProductVariant[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [bulkPriceKey, setBulkPriceKey] = useState(0);
  const [bulkToggleTarget, setBulkToggleTarget] = useState<boolean | null>(null);

  const { executeAsync: executeFetchVariants, isExecuting: isFetchingVariants } = useAction(getVariantsAction);
  const { executeAsync: executeToggle, isExecuting: isToggling } = useAction(bulkToggleProductsAction);

  const fetchVariants = useCallback(
    async (currentPage: number, search: string) => {
      const result = await executeFetchVariants({
        filters: search ? { search } : undefined,
        options: { limit: 50, page: currentPage, sort: 'product' },
      });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        setVariants(result.data.docs);
        setTotalDocs(result.data.totalDocs);
        setTotalPages(result.data.totalPages);
        const value = result.data.docs.reduce((sum, v) => sum + v.stock * v.costPrice, 0);
        setInventoryValue(value);
      }
    },
    [executeFetchVariants],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await executeFetchVariants({
        filters: searchQuery ? { search: searchQuery } : undefined,
        options: { limit: 50, page, sort: 'product' },
      });
      if (cancelled) return;

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        setVariants(result.data.docs);
        setTotalDocs(result.data.totalDocs);
        setTotalPages(result.data.totalPages);
        const value = result.data.docs.reduce((sum, v) => sum + v.stock * v.costPrice, 0);
        setInventoryValue(value);
      }

      setIsInitialLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, executeFetchVariants]);

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
    void fetchVariants(page, searchQuery);
  }, [fetchVariants, page, searchQuery]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProductId(undefined);
  };

  const handleBulkPriceSuccess = () => {
    setSelectedKeys(new Set());
    void fetchVariants(page, searchQuery);
  };

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
      toast.success(`${result.data.updated} productos ${label}`);
      setSelectedKeys(new Set());
      setBulkToggleTarget(null);
      void fetchVariants(page, searchQuery);
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
          <div className="flex items-center gap-2">
            {canCreateProduct && !isInitialLoading && totalDocs > 0 && (
              <div
                className="flex h-9 items-center gap-1 text-sm text-muted-foreground sm:gap-1.5 sm:rounded-md sm:border sm:bg-muted/60 sm:px-2.5"
                title="Valor del inventario (página actual)"
              >
                <Warehouse className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">$ {inventoryValue.toLocaleString('es-AR')}</span>
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

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre, código, marca..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <ColumnVisibilityDropdown tableName="products" />
        </div>

        <ProductsTable
          ref={tableRef}
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
          isLoading={isInitialLoading || isFetchingVariants}
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
