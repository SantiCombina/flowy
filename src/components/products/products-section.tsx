'use client';

import { Plus, Search } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout/page-header';
import { useUserOptional } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { Input } from '@/components/ui/input';
import type { Brand, Category, Quality, Presentation } from '@/payload-types';

import { getReferenceDataAction } from './actions';
import { ProductModal } from './product-modal-new/index';
import { ProductsTable, type ProductsTableRef } from './products-table';

interface RefData {
  brands: Brand[];
  categories: Category[];
  qualities: Quality[];
  presentations: Presentation[];
}

let refDataCache: RefData | null = null;

const emptyRefData: RefData = {
  brands: [],
  categories: [],
  qualities: [],
  presentations: [],
};

export function ProductsSection() {
  const user = useUserOptional();
  const canCreateProduct = user?.role === 'owner' || user?.role === 'admin';
  const tableRef = useRef<ProductsTableRef>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | undefined>();
  const [referenceData, setReferenceData] = useState<RefData>(refDataCache ?? emptyRefData);

  const loadReferenceData = useCallback(async (forceRefresh = false) => {
    if (refDataCache && !forceRefresh) {
      setReferenceData(refDataCache);
      return true;
    }

    const result = await getReferenceDataAction();

    if (result?.serverError) {
      toast.error(result.serverError);
      return false;
    }

    if (result?.data?.success) {
      refDataCache = {
        brands: result.data.brands,
        categories: result.data.categories,
        qualities: result.data.qualities,
        presentations: result.data.presentations,
      };
      setReferenceData(refDataCache);
      return true;
    }
    return false;
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProductId(undefined);
    setIsModalOpen(true);
    void loadReferenceData();
  };

  const handleOpenEditModal = (productId: number) => {
    setEditingProductId(productId);
    setIsModalOpen(true);
    void loadReferenceData();
  };

  const handleSuccess = useCallback(() => {
    void tableRef.current?.silentRefresh();
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProductId(undefined);
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

        <ProductsTable
          ref={tableRef}
          searchQuery={searchQuery}
          onEdit={canCreateProduct ? handleOpenEditModal : undefined}
          showActions={canCreateProduct}
          showInventoryValue={canCreateProduct}
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
        onRefreshEntities={() => loadReferenceData(true)}
      />
    </div>
  );
}
