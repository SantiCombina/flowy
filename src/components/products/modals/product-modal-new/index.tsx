'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';

import { DeleteConfirmationDialog } from './components/delete-confirmation-dialog';
import { ProductAttributesSection } from './components/product-attributes-section';
import { ProductFormSkeleton } from './components/product-form-skeleton';
import { ProductInfoSection } from './components/product-info-section';
import { ProductVariantsSection } from './components/product-variants-section';
import { useEntityDialog } from './hooks/useEntityDialog';
import { useProductForm } from './hooks/useProductForm';
import type { ProductModalProps } from './types';

export function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  productId,
  brands: initialBrands,
  categories: initialCategories,
  qualities: initialQualities,
  presentations: initialPresentations,
  onRefreshEntities,
}: ProductModalProps) {
  const [brands, setBrands] = useState(initialBrands);
  const [categories, setCategories] = useState(initialCategories);
  const [qualities, setQualities] = useState(initialQualities);
  const [presentations, setPresentations] = useState(initialPresentations);

  const {
    form,
    isEditing,
    isSubmitting,
    isLoading,
    fields,
    handleAddVariant,
    handleRemoveVariant,
    handleClose,
    pendingImageFile,
    currentImageUrl,
    handleFileSelect,
    onSubmit,
  } = useProductForm({
    productId,
    isOpen,
    onSuccess,
    onClose,
  });

  const {
    openDeleteEntity,
    closeConfirmDelete,
    handleDeleteEntity,
    handleCreateEntity,
    confirmDelete,
    getEntityLabel,
    isExecuting: isEntityExecuting,
  } = useEntityDialog({
    setBrands,
    setCategories,
    setQualities,
    setPresentations,
    setValue: form.setValue,
    onRefreshEntities,
  });

  const hasEmptyPresentation = presentations.some((p) => !p.label.trim());

  return (
    <>
      <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-3xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {isEditing
              ? 'Modificá los datos del producto y sus presentaciones.'
              : 'Completá los datos del producto y al menos una presentación con su precio.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {isLoading ? (
          <ProductFormSkeleton />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <ResponsiveModalBody className="space-y-5">
                <ProductInfoSection
                  pendingImageFile={pendingImageFile}
                  currentImageUrl={currentImageUrl}
                  onFileSelect={handleFileSelect}
                />

                <ProductAttributesSection
                  brands={brands}
                  categories={categories}
                  qualities={qualities}
                  onCreateEntity={handleCreateEntity}
                  onDeleteEntity={openDeleteEntity}
                />

                <ProductVariantsSection
                  fields={fields}
                  onAddVariant={handleAddVariant}
                  onRemoveVariant={handleRemoveVariant}
                  presentations={presentations}
                  onCreatePresentation={(name) => handleCreateEntity('presentation', name)}
                  onDeletePresentation={(id, label) => openDeleteEntity('presentation', id, label)}
                  hasEmptyPresentation={hasEmptyPresentation}
                />
              </ResponsiveModalBody>

              <ResponsiveModalFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      Guardando
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </span>
                  ) : isEditing ? (
                    'Guardar cambios'
                  ) : (
                    'Crear producto'
                  )}
                </Button>
              </ResponsiveModalFooter>
            </form>
          </Form>
        )}
      </ResponsiveModal>

      <DeleteConfirmationDialog
        isOpen={confirmDelete.isOpen}
        entityName={confirmDelete.name}
        entityLabel={confirmDelete.type ? getEntityLabel(confirmDelete.type) : ''}
        onConfirm={handleDeleteEntity}
        onCancel={closeConfirmDelete}
        isExecuting={isEntityExecuting}
      />
    </>
  );
}
