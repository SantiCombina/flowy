'use client';

import { ImageOff, MoreVertical, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
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
import type { Product } from '@/payload-types';

import { getVariantsAction, deleteProductAction } from './actions';
import { StockMovementModal } from './stock-movement-modal';

const variantsCache: { data: PopulatedProductVariant[]; timestamp: number } = { data: [], timestamp: 0 };
const STALE_TIME = 2 * 60 * 1000;

interface ProductsTableProps {
  searchQuery?: string;
  onEdit?: (productId: number) => void;
}

export interface ProductsTableRef {
  refresh: () => Promise<void>;
}

export const ProductsTable = forwardRef<ProductsTableRef, ProductsTableProps>(({ searchQuery = '', onEdit }, ref) => {
  const router = useRouter();
  const { getItemsPerPage, getVisibleColumns, isLoading: isSettingsLoading, updateItemsPerPage } = useSettings();

  const [allVariants, setAllVariants] = useState<PopulatedProductVariant[]>(variantsCache.data);
  const [isLoading, setIsLoading] = useState(variantsCache.data.length === 0);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [variantForMovement, setVariantForMovement] = useState<PopulatedProductVariant | null>(null);
  const itemsPerPageSyncedRef = useRef(false);

  const filteredVariants = useMemo(() => {
    if (!searchQuery.trim()) return allVariants;
    const q = searchQuery.toLowerCase();
    return allVariants.filter((v) => {
      const brand = typeof v.product.brand === 'object' ? v.product.brand?.name : '';
      return (
        v.product.name.toLowerCase().includes(q) ||
        (v.code && v.code.toLowerCase().includes(q)) ||
        (brand && brand.toLowerCase().includes(q))
      );
    });
  }, [allVariants, searchQuery]);

  const totalItems = filteredVariants.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const paginatedVariants = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredVariants.slice(start, start + itemsPerPage);
  }, [filteredVariants, page, itemsPerPage]);

  useEffect(() => {
    if (!isSettingsLoading) {
      if (!itemsPerPageSyncedRef.current) {
        setItemsPerPage(getItemsPerPage());
        itemsPerPageSyncedRef.current = true;
      }
      setVisibleColumns(getVisibleColumns('products'));
    }
  }, [isSettingsLoading, getItemsPerPage, getVisibleColumns]);

  const loadVariants = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const result = await getVariantsAction({
        options: {
          limit: 10000,
          sort: 'product',
        },
      });

      if (result?.serverError) {
        if (!silent) toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        variantsCache.data = result.data.docs;
        variantsCache.timestamp = Date.now();
        setAllVariants(result.data.docs);
      } else {
        if (!silent) toast.error('Error al cargar productos');
      }
    } catch (error) {
      console.error('Exception loading variants:', error);
      if (!silent) toast.error('Error al cargar productos');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (variantsCache.data.length > 0) {
      if (Date.now() - variantsCache.timestamp > STALE_TIME) {
        void loadVariants(true);
      }
    } else {
      void loadVariants(false);
    }
  }, [loadVariants]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleDelete = async () => {
    if (!productToDelete) return;

    const productId = productToDelete.id;

    try {
      const result = await deleteProductAction({ id: productId });

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      if (result?.data?.success) {
        toast.success('Producto eliminado correctamente');
        removeVariantsByProduct(productId);
      } else {
        toast.error('Error al eliminar producto');
      }
    } catch (error) {
      console.error('Exception deleting product:', error);
      toast.error('Error al eliminar producto');
    } finally {
      setProductToDelete(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setPage(1);
    void updateItemsPerPage(newItemsPerPage as Parameters<typeof updateItemsPerPage>[0]);
  };

  useImperativeHandle(ref, () => ({
    refresh: () => loadVariants(false),
  }));

  const updateVariantStock = useCallback((variantId: number, newStock: number) => {
    setAllVariants((prev) => {
      const updated = prev.map((variant) => (variant.id === variantId ? { ...variant, stock: newStock } : variant));
      variantsCache.data = updated;
      return updated;
    });
  }, []);

  const removeVariantsByProduct = useCallback((productId: number) => {
    setAllVariants((prev) => {
      const filtered = prev.filter((variant) => variant.product.id !== productId);
      variantsCache.data = filtered;
      return filtered;
    });
  }, []);

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
              <img src={image} alt={product.name} className="h-10 w-10 rounded object-cover" />
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
      cell: (variant) => {
        const product = variant.product;
        return <div className="font-medium">{product.name}</div>;
      },
    },
    code: {
      key: 'code',
      header: COLUMN_LABELS.code,
      cell: (variant) => (
        <span className="inline-block px-2.5 py-1 rounded-md bg-muted font-mono text-sm font-medium tracking-wide text-foreground/90">
          {variant.code || '-'}
        </span>
      ),
    },
    brand: {
      key: 'brand',
      header: COLUMN_LABELS.brand,
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
      cell: (variant) => {
        const presentation = variant.presentation;
        return <span>{presentation?.label || '-'}</span>;
      },
    },
    stock: {
      key: 'stock',
      header: COLUMN_LABELS.stock,
      cell: (variant) => {
        const stock = variant.stock;
        const minStock = variant.minStock || 0;
        const ratio = minStock > 0 ? stock / minStock : Infinity;

        if (ratio <= 1) {
          return <Badge variant="destructive">{stock}</Badge>;
        } else if (ratio < 2) {
          return <Badge className="bg-orange-400 hover:bg-orange-500 text-white border-orange-400">{stock}</Badge>;
        } else {
          return <Badge className="bg-white text-foreground border border-gray-200 shadow-none">{stock}</Badge>;
        }
      },
    },
    price: {
      key: 'price',
      header: COLUMN_LABELS.price,
      cell: (variant) => {
        const formattedPrice = variant.price.toLocaleString('es-AR', {
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
    isActive: {
      key: 'isActive',
      header: COLUMN_LABELS.isActive,
      cell: (variant) => {
        const product = variant.product;
        return (
          <span className="inline-block px-2.5 py-1 rounded-md bg-muted font-medium text-sm">
            {product.isActive ? 'Activo' : 'Inactivo'}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                if (onEdit) {
                  onEdit(product.id);
                } else {
                  router.push(`/products/${product.id}/edit`);
                }
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setVariantForMovement(variant)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Registrar movimiento
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setProductToDelete(product)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    className: 'w-16',
  };

  const columns: Column<PopulatedProductVariant>[] = [
    allColumns.image,
    ...Object.entries(allColumns)
      .filter(([key]) => key !== 'image' && shouldShowColumn(key))
      .map(([, column]) => column),
    actionsColumn,
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={paginatedVariants}
        keyExtractor={(v) => `${v.id}-${v.product.id}`}
        isLoading={isLoading || isSettingsLoading}
        emptyMessage={searchQuery ? 'No se encontraron productos' : 'No hay productos'}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        totalItems={totalItems}
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
        onSuccess={(variantId, newStock) => {
          updateVariantStock(variantId, newStock);
        }}
      />
    </>
  );
});

ProductsTable.displayName = 'ProductsTable';
