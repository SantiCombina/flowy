import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import type { Brand, Category, Quality, Presentation } from '@/payload-types';

import {
  createBrandAction,
  updateBrandAction,
  deleteBrandAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createQualityAction,
  updateQualityAction,
  deleteQualityAction,
  createPresentationAction,
  updatePresentationAction,
  deletePresentationAction,
} from '../../entity-actions';
import type { EntityType, EntityDialogState } from '../types';

interface UseEntityDialogProps {
  setBrands: React.Dispatch<React.SetStateAction<Brand[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setQualities: React.Dispatch<React.SetStateAction<Quality[]>>;
  setPresentations: React.Dispatch<React.SetStateAction<Presentation[]>>;
  setValue: (name: 'brandId' | 'categoryId' | 'qualityId', value: string) => void;
  onRefreshEntities: () => void;
}

export function useEntityDialog({
  setBrands,
  setCategories,
  setQualities,
  setPresentations,
  setValue,
  onRefreshEntities,
}: UseEntityDialogProps) {
  const { executeAsync: createBrand, isExecuting: isCreatingBrand } = useAction(createBrandAction);
  const { executeAsync: updateBrand, isExecuting: isUpdatingBrand } = useAction(updateBrandAction);
  const { executeAsync: deleteBrand, isExecuting: isDeletingBrand } = useAction(deleteBrandAction);
  const { executeAsync: createCategory, isExecuting: isCreatingCategory } = useAction(createCategoryAction);
  const { executeAsync: updateCategory, isExecuting: isUpdatingCategory } = useAction(updateCategoryAction);
  const { executeAsync: deleteCategory, isExecuting: isDeletingCategory } = useAction(deleteCategoryAction);
  const { executeAsync: createQuality, isExecuting: isCreatingQuality } = useAction(createQualityAction);
  const { executeAsync: updateQuality, isExecuting: isUpdatingQuality } = useAction(updateQualityAction);
  const { executeAsync: deleteQuality, isExecuting: isDeletingQuality } = useAction(deleteQualityAction);
  const { executeAsync: createPresentation, isExecuting: isCreatingPresentation } = useAction(createPresentationAction);
  const { executeAsync: updatePresentation, isExecuting: isUpdatingPresentation } = useAction(updatePresentationAction);
  const { executeAsync: deletePresentation, isExecuting: isDeletingPresentation } = useAction(deletePresentationAction);

  const isExecuting =
    isCreatingBrand ||
    isUpdatingBrand ||
    isDeletingBrand ||
    isCreatingCategory ||
    isUpdatingCategory ||
    isDeletingCategory ||
    isCreatingQuality ||
    isUpdatingQuality ||
    isDeletingQuality ||
    isCreatingPresentation ||
    isUpdatingPresentation ||
    isDeletingPresentation;

  const [entityDialog, setEntityDialog] = useState<EntityDialogState>({
    isOpen: false,
    type: null,
    mode: 'create',
  });
  const [entityName, setEntityName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    type: EntityType | null;
    id: number | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: '',
  });

  const openCreateEntity = (type: EntityType) => {
    setEntityDialog({ isOpen: true, type, mode: 'create' });
    setEntityName('');
  };

  const openEditEntity = (type: EntityType, id: number, currentValue: string) => {
    setEntityDialog({ isOpen: true, type, mode: 'edit', id, currentValue });
    setEntityName(currentValue);
  };

  const openDeleteEntity = (type: EntityType, id: number, name: string) => {
    setConfirmDelete({ isOpen: true, type, id, name });
  };

  const closeEntityDialog = () => {
    setEntityDialog({ isOpen: false, type: null, mode: 'create' });
    setEntityName('');
  };

  const closeConfirmDelete = () => {
    setConfirmDelete({ isOpen: false, type: null, id: null, name: '' });
  };

  const getEntityLabel = (type: EntityType) => {
    const labels = {
      brand: 'marca',
      category: 'categoría',
      quality: 'calidad',
      presentation: 'presentación',
    };
    return labels[type];
  };

  const handleSaveEntity = async () => {
    if (!entityDialog.type || !entityName.trim()) return;

    try {
      const { type, mode, id } = entityDialog;
      const label = getEntityLabel(type);

      if (mode === 'create') {
        let result:
          | Awaited<
              ReturnType<typeof createBrand | typeof createCategory | typeof createQuality | typeof createPresentation>
            >
          | undefined;

        switch (type) {
          case 'brand': {
            result = await createBrand({ name: entityName });
            if (result?.data?.brand) {
              const { brand } = result.data;
              setBrands((prev) => [...prev, brand]);
              setValue('brandId', brand.id.toString());
            }
            break;
          }
          case 'category': {
            result = await createCategory({ name: entityName });
            if (result?.data?.category) {
              const { category } = result.data;
              setCategories((prev) => [...prev, category]);
              setValue('categoryId', category.id.toString());
            }
            break;
          }
          case 'quality': {
            result = await createQuality({ name: entityName });
            if (result?.data?.quality) {
              const { quality } = result.data;
              setQualities((prev) => [...prev, quality]);
              setValue('qualityId', quality.id.toString());
            }
            break;
          }
          case 'presentation': {
            result = await createPresentation({ label: entityName });
            if (result?.data?.presentation) {
              const { presentation } = result.data;
              setPresentations((prev) => [...prev, presentation]);
            }
            break;
          }
        }

        if (result?.serverError) {
          toast.error(result.serverError);
          return;
        }

        toast.success(`${label} creada exitosamente`);
      } else if (mode === 'edit' && id) {
        let result:
          | Awaited<
              ReturnType<typeof updateBrand | typeof updateCategory | typeof updateQuality | typeof updatePresentation>
            >
          | undefined;

        switch (type) {
          case 'brand': {
            result = await updateBrand({ id, name: entityName });
            if (result?.data?.brand) {
              const { brand } = result.data;
              setBrands((prev) => prev.map((b) => (b.id === id ? brand : b)));
            }
            break;
          }
          case 'category': {
            result = await updateCategory({ id, name: entityName });
            if (result?.data?.category) {
              const { category } = result.data;
              setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
            }
            break;
          }
          case 'quality': {
            result = await updateQuality({ id, name: entityName });
            if (result?.data?.quality) {
              const { quality } = result.data;
              setQualities((prev) => prev.map((q) => (q.id === id ? quality : q)));
            }
            break;
          }
          case 'presentation': {
            result = await updatePresentation({ id, label: entityName });
            if (result?.data?.presentation) {
              const { presentation } = result.data;
              setPresentations((prev) => prev.map((p) => (p.id === id ? presentation : p)));
            }
            break;
          }
        }

        if (result?.serverError) {
          toast.error(result.serverError);
          return;
        }

        toast.success(`${label} actualizada exitosamente`);
      }

      closeEntityDialog();
      onRefreshEntities();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar');
    }
  };

  const handleDeleteEntity = async () => {
    if (!confirmDelete.type || !confirmDelete.id) return;

    try {
      const { type, id } = confirmDelete;
      const label = getEntityLabel(type);
      let result:
        | Awaited<
            ReturnType<typeof deleteBrand | typeof deleteCategory | typeof deleteQuality | typeof deletePresentation>
          >
        | undefined;

      switch (type) {
        case 'brand': {
          result = await deleteBrand({ id });
          if (result?.data?.success) {
            setBrands((prev) => prev.filter((b) => b.id !== id));
            setValue('brandId', '');
          }
          break;
        }
        case 'category': {
          result = await deleteCategory({ id });
          if (result?.data?.success) {
            setCategories((prev) => prev.filter((c) => c.id !== id));
            setValue('categoryId', '');
          }
          break;
        }
        case 'quality': {
          result = await deleteQuality({ id });
          if (result?.data?.success) {
            setQualities((prev) => prev.filter((q) => q.id !== id));
            setValue('qualityId', '');
          }
          break;
        }
        case 'presentation': {
          result = await deletePresentation({ id });
          if (result?.data?.success) {
            setPresentations((prev) => prev.filter((p) => p.id !== id));
          }
          break;
        }
      }

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      toast.success(`${label} eliminada exitosamente`);
      closeConfirmDelete();
      onRefreshEntities();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar');
    }
  };

  const handleCreateEntity = async (type: EntityType, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;

    try {
      const label = getEntityLabel(type);
      let result:
        | Awaited<
            ReturnType<typeof createBrand | typeof createCategory | typeof createQuality | typeof createPresentation>
          >
        | undefined;

      switch (type) {
        case 'brand': {
          result = await createBrand({ name: trimmedName });
          if (result?.data?.brand) {
            const { brand } = result.data;
            setBrands((prev) => [...prev, brand]);
            setValue('brandId', brand.id.toString());
            onRefreshEntities();
            toast.success(`${label} creada exitosamente`);
            return { id: brand.id, name: brand.name };
          }
          break;
        }
        case 'category': {
          result = await createCategory({ name: trimmedName });
          if (result?.data?.category) {
            const { category } = result.data;
            setCategories((prev) => [...prev, category]);
            setValue('categoryId', category.id.toString());
            onRefreshEntities();
            toast.success(`${label} creada exitosamente`);
            return { id: category.id, name: category.name };
          }
          break;
        }
        case 'quality': {
          result = await createQuality({ name: trimmedName });
          if (result?.data?.quality) {
            const { quality } = result.data;
            setQualities((prev) => [...prev, quality]);
            setValue('qualityId', quality.id.toString());
            onRefreshEntities();
            toast.success(`${label} creada exitosamente`);
            return { id: quality.id, name: quality.name };
          }
          break;
        }
        case 'presentation': {
          result = await createPresentation({ label: trimmedName });
          if (result?.data?.presentation) {
            const { presentation } = result.data;
            setPresentations((prev) => [...prev, presentation]);
            onRefreshEntities();
            toast.success(`${label} creada exitosamente`);
            return { id: presentation.id, name: presentation.label };
          }
          break;
        }
      }

      if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear');
    }

    return null;
  };

  return {
    entityDialog,
    entityName,
    setEntityName,
    openCreateEntity,
    openEditEntity,
    openDeleteEntity,
    closeEntityDialog,
    handleSaveEntity,
    handleCreateEntity,
    confirmDelete,
    closeConfirmDelete,
    handleDeleteEntity,
    getEntityLabel,
    isExecuting,
  };
}
