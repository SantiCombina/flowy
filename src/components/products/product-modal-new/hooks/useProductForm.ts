import { zodResolver } from '@hookform/resolvers/zod';
import { useAction } from 'next-safe-action/hooks';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';

import { convertToWebP } from '@/lib/image-utils';
import type { ProductVariant } from '@/payload-types';
import { productSchema, type ProductFormData } from '@/schemas/products/product-schema';

import {
  createProductAction,
  updateProductAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  getProductByIdAction,
} from '../../actions';
import { deleteMediaAction } from '../../media-actions';

interface PayloadMediaResponse {
  doc: { id: number; url?: string | null };
  errors?: Array<{ message: string }>;
}

interface UseProductFormProps {
  productId?: number;
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

async function uploadImage(file: File, altText: string): Promise<number> {
  const webpFile = await convertToWebP(file);
  const formData = new FormData();
  formData.append('file', webpFile);
  formData.append('_payload', JSON.stringify({ alt: altText }));

  const response = await fetch('/api/media', { method: 'POST', body: formData });
  const data = (await response.json()) as PayloadMediaResponse;

  if (!response.ok) {
    throw new Error(data.errors?.[0]?.message ?? 'Error al subir la imagen');
  }
  return data.doc.id;
}

export function useProductForm({ productId, isOpen, onSuccess, onClose }: UseProductFormProps) {
  const isEditing = !!productId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeAsync: getProductById, isExecuting: isLoading } = useAction(getProductByIdAction);
  const [variantsToDelete, setVariantsToDelete] = useState<number[]>([]);
  const [currentImageId, setCurrentImageId] = useState<number | undefined>(undefined);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [previousImageId, setPreviousImageId] = useState<number | undefined>(undefined);
  const [pendingImageFile, setPendingImageFile] = useState<File | undefined>(undefined);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      brandId: '',
      categoryId: '',
      qualityId: '',
      isActive: true,
      variants: [
        {
          presentationId: '',
          code: '',
          stock: 0,
          minimumStock: 0,
          costPrice: 0,
          profitMargin: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  const resetImageState = () => {
    setCurrentImageId(undefined);
    setCurrentImageUrl(undefined);
    setPreviousImageId(undefined);
    setPendingImageFile(undefined);
  };

  useEffect(() => {
    if (isEditing && productId && isOpen) {
      getProductById({ id: productId })
        .then((result) => {
          if (result?.serverError) {
            toast.error(result.serverError);
            return;
          }

          if (result?.data?.product) {
            const product = result.data.product;
            const variants = result.data.variants || [];

            reset({
              name: product.name,
              description: product.description || '',
              brandId: typeof product.brand === 'object' && product.brand ? product.brand.id.toString() : '',
              categoryId:
                typeof product.category === 'object' && product.category ? product.category.id.toString() : '',
              qualityId: typeof product.quality === 'object' && product.quality ? product.quality.id.toString() : '',
              isActive: product.isActive ?? true,
              variants: variants.map((v: ProductVariant) => ({
                id: v.id,
                presentationId:
                  typeof v.presentation === 'object' && v.presentation ? v.presentation.id.toString() : '',
                code: v.code || '',
                stock: v.stock || 0,
                minimumStock: v.minimumStock ?? 0,
                costPrice: v.costPrice || 0,
                profitMargin: v.profitMargin ?? 0,
              })),
            });

            if (typeof product.image === 'object' && product.image) {
              setCurrentImageId(product.image.id);
              setCurrentImageUrl(product.image.url ?? undefined);
              setPreviousImageId(product.image.id);
            } else if (typeof product.image === 'number') {
              setCurrentImageId(product.image);
              setPreviousImageId(product.image);
            } else {
              resetImageState();
            }
          }
        })
        .catch(() => undefined);
    }
  }, [isEditing, productId, isOpen, reset, getProductById]);

  const handleClose = () => {
    reset();
    setVariantsToDelete([]);
    resetImageState();
    onClose();
  };

  const handleRemoveVariant = (index: number) => {
    const variant = fields[index];
    if (variant.id) {
      setVariantsToDelete((prev) => [...prev, variant.id!]);
    }
    remove(index);
  };

  const handleAddVariant = () => {
    append({
      presentationId: '',
      code: '',
      stock: 0,
      minimumStock: 0,
      costPrice: 0,
      profitMargin: 0,
    });
  };

  const handleFileSelect = (file: File | undefined) => {
    setPendingImageFile(file);
    if (!file) {
      setCurrentImageId(undefined);
      setCurrentImageUrl(undefined);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      let resolvedImageId = currentImageId;

      if (pendingImageFile) {
        const altText = data.name.trim() || 'imagen-producto';
        resolvedImageId = await uploadImage(pendingImageFile, altText);
      }

      if (isEditing && productId) {
        const productResult = await updateProductAction({
          id: productId,
          name: data.name,
          description: data.description,
          brand: data.brandId ? parseInt(data.brandId) : undefined,
          category: data.categoryId ? parseInt(data.categoryId) : undefined,
          quality: data.qualityId ? parseInt(data.qualityId) : undefined,
          image: resolvedImageId,
          isActive: data.isActive,
        });

        if (productResult?.serverError) {
          toast.error(productResult.serverError);
          return;
        }

        if (!productResult?.data?.success) {
          toast.error('Error al actualizar el producto');
          return;
        }

        if (previousImageId !== undefined && previousImageId !== resolvedImageId) {
          await deleteMediaAction({ id: previousImageId });
        }

        for (const variantId of variantsToDelete) {
          const deleteResult = await deleteVariantAction({ id: variantId });
          if (deleteResult?.serverError) {
            toast.error(`Error al eliminar variante: ${deleteResult.serverError}`);
            return;
          }
        }

        for (const variant of data.variants) {
          if (variant.id) {
            const updateResult = await updateVariantAction({
              id: variant.id,
              code: variant.code || '',
              ...(variant.presentationId && { presentation: parseInt(variant.presentationId) }),
              stock: variant.stock,
              minimumStock: variant.minimumStock,
              costPrice: variant.costPrice,
              profitMargin: variant.profitMargin,
            });
            if (updateResult?.serverError) {
              toast.error(`Error al actualizar variante: ${updateResult.serverError}`);
              return;
            }
          } else {
            const createResult = await createVariantAction({
              code: variant.code || '',
              product: productId,
              ...(variant.presentationId && { presentation: parseInt(variant.presentationId) }),
              stock: variant.stock,
              minimumStock: variant.minimumStock,
              costPrice: variant.costPrice,
              profitMargin: variant.profitMargin,
            });
            if (createResult?.serverError) {
              toast.error(`Error al crear variante: ${createResult.serverError}`);
              return;
            }
          }
        }

        toast.success('Producto actualizado exitosamente');
      } else {
        const productResult = await createProductAction({
          name: data.name,
          description: data.description,
          brand: data.brandId ? parseInt(data.brandId) : undefined,
          category: data.categoryId ? parseInt(data.categoryId) : undefined,
          quality: data.qualityId ? parseInt(data.qualityId) : undefined,
          image: resolvedImageId,
          isActive: data.isActive,
        });

        if (productResult?.serverError) {
          toast.error(productResult.serverError);
          return;
        }

        if (!productResult?.data?.success) {
          toast.error('Error al crear el producto');
          return;
        }

        const newProductId = productResult.data.product.id;

        for (const variant of data.variants) {
          const createResult = await createVariantAction({
            code: variant.code || '',
            product: newProductId,
            ...(variant.presentationId && { presentation: parseInt(variant.presentationId) }),
            stock: variant.stock,
            minimumStock: variant.minimumStock,
            costPrice: variant.costPrice,
            profitMargin: variant.profitMargin,
          });
          if (createResult?.serverError) {
            toast.error(`Error al crear variante: ${createResult.serverError}`);
            return;
          }
        }

        toast.success('Producto creado exitosamente');
      }

      handleClose();
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar el producto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isEditing,
    isSubmitting,
    isLoading,
    register,
    control,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    setValue,
    watch,
    fields,
    handleAddVariant,
    handleRemoveVariant,
    handleClose,
    pendingImageFile,
    currentImageUrl,
    handleFileSelect,
  };
}
