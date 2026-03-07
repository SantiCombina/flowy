'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { DeleteConfirmationDialog } from './components/delete-confirmation-dialog';
import { EntityDialog } from './components/entity-dialog';
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
  } = useProductForm({
    productId,
    isOpen,
    onSuccess,
    onClose,
  });

  const {
    entityDialog,
    entityName,
    setEntityName,
    openCreateEntity,
    openDeleteEntity,
    closeEntityDialog,
    handleSaveEntity,
    confirmDelete,
    closeConfirmDelete,
    handleDeleteEntity,
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifica los datos del producto.' : 'Completa los datos del producto y sus presentaciones.'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="overflow-y-auto flex-1 space-y-5 pr-1">
                <ProductInfoSection register={register} control={control} errors={errors} />

                <ProductAttributesSection
                  control={control}
                  brands={brands}
                  categories={categories}
                  qualities={qualities}
                  onCreateEntity={openCreateEntity}
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
                  onCreatePresentation={() => openCreateEntity('presentation')}
                  onDeletePresentation={(id, label) => openDeleteEntity('presentation', id, label)}
                />
              </div>

              <DialogFooter className="gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear producto'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <EntityDialog
        entityDialog={entityDialog}
        entityName={entityName}
        onEntityNameChange={setEntityName}
        onClose={closeEntityDialog}
        onSave={handleSaveEntity}
        getEntityLabel={getEntityLabel}
        isExecuting={isEntityExecuting}
      />

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
