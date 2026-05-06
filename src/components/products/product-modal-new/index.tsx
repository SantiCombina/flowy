'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
    isEditing,
    isSubmitting,
    isLoading,
    register,
    control,
    handleSubmit,
    errors,
    setValue,
    fields,
    handleAddVariant,
    handleRemoveVariant,
    handleClose,
    pendingImageFile,
    currentImageUrl,
    handleFileSelect,
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
    setValue,
    onRefreshEntities,
  });

  const hasEmptyPresentation = presentations.some((p) => !p.label.trim());

  return (
    <>
      <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-3xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {isEditing ? 'Modifica los datos del producto.' : 'Completa los datos del producto y sus presentaciones.'}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {isLoading ? (
          <ResponsiveModalBody className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </ResponsiveModalBody>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <ResponsiveModalBody className="space-y-5">
              <ProductInfoSection
                register={register}
                control={control}
                errors={errors}
                pendingImageFile={pendingImageFile}
                currentImageUrl={currentImageUrl}
                onFileSelect={handleFileSelect}
              />

              <ProductAttributesSection
                control={control}
                brands={brands}
                categories={categories}
                qualities={qualities}
                onCreateEntity={handleCreateEntity}
                onDeleteEntity={openDeleteEntity}
              />

              <ProductVariantsSection
                fields={fields}
                errors={errors}
                register={register}
                control={control}
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
                {isSubmitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </ResponsiveModalFooter>
          </form>
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
