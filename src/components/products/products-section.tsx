'use client';

import { DollarSign, EyeOff, Eye, Plus, Search, X } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState, useCallback, useRef, useMemo } from 'react';
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

import { getReferenceDataAction, bulkToggleProductsAction } from './actions';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | undefined>();
  const [referenceData, setReferenceData] = useState<RefData>(initialRefData);

  const [allVariants, setAllVariants] = useState<PopulatedProductVariant[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(new Set());
  const [isBulkPriceOpen, setIsBulkPriceOpen] = useState(false);
  const [bulkPriceKey, setBulkPriceKey] = useState(0);
  const [bulkToggleTarget, setBulkToggleTarget] = useState<boolean | null>(null);

  const { executeAsync: executeToggle, isExecuting: isToggling } = useAction(bulkToggleProductsAction);

  const selectedVariants = useMemo(
    () => allVariants.filter((v) => selectedKeys.has(`${v.id}-${v.product.id}`)),
    [allVariants, selectedKeys],
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
    void tableRef.current?.silentRefresh();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProductId(undefined);
  };

  const handleBulkPriceSuccess = () => {
    setSelectedKeys(new Set());
    void tableRef.current?.silentRefresh();
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
      void tableRef.current?.silentRefresh();
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
          canCreateProduct ? (
            <Button onClick={handleOpenCreateModal} size="sm">
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          ) : undefined
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ColumnVisibilityDropdown tableName="products" />
        </div>

        {selectedKeys.size > 0 && canCreateProduct && (
          <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 px-3 py-2 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between sm:justify-start">
              <span className="text-sm font-medium text-foreground">{selectedKeys.size} seleccionadas</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedKeys(new Set())}
                aria-label="Deseleccionar todo"
                className="sm:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBulkPriceKey((k) => k + 1);
                  setIsBulkPriceOpen(true);
                }}
              >
                <DollarSign className="h-4 w-4" />
                Editar precios
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkToggleTarget(false)}>
                <EyeOff className="h-4 w-4" />
                Pausar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkToggleTarget(true)}>
                <Eye className="h-4 w-4" />
                Activar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedKeys(new Set())}
                aria-label="Deseleccionar todo"
                className="hidden sm:inline-flex"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <ProductsTable
          ref={tableRef}
          searchQuery={searchQuery}
          onEdit={canCreateProduct ? handleOpenEditModal : undefined}
          showActions={canCreateProduct}
          showInventoryValue={canCreateProduct}
          selectable={canCreateProduct}
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          onVariantsChange={setAllVariants}
        />
      </main>

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
