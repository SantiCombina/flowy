import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';

import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { convertToWebP } from '@/lib/image-utils';
import { queryKeys } from '@/lib/query-keys';
import type { ProductVariant } from '@/payload-types';
import { productSchema, type ProductFormData } from '@/schemas/products/product-schema';

import {
  createProductAction,
  updateProductAction,
  createVariantAction,
  updateVariantAction,
  deleteVariantAction,
  getProductByIdAction,
} from '../../../actions';
import { deleteMediaAction } from '../../../media-actions';

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

const EMPTY_FORM: ProductFormData = {
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
};

const generateTempId = () => -Date.now();

export function useProductForm({ productId, isOpen, onSuccess, onClose }: UseProductFormProps) {
  const isEditing = !!productId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useServerActionQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => getProductByIdAction({ id: productId! }),
    enabled: isEditing && !!productId && isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const [variantsToDelete, setVariantsToDelete] = useState<number[]>([]);
  const [currentImageId, setCurrentImageId] = useState<number | undefined>(undefined);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [previousImageId, setPreviousImageId] = useState<number | undefined>(undefined);
  const [pendingImageFile, setPendingImageFile] = useState<File | undefined>(undefined);

  const prevProductIdRef = useRef(productId);

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
    defaultValues: EMPTY_FORM,
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
    const prev = prevProductIdRef.current;
    prevProductIdRef.current = productId;

    if (prev !== undefined && productId === undefined) {
      reset(EMPTY_FORM);
      resetImageState();
      setVariantsToDelete([]);
    }
  }, [productId, reset]);

  useEffect(() => {
    if (!isEditing || !productId || !isOpen || !data?.success) return;

    queueMicrotask(() => {
      const product = data.product;
      const variants = data.variants || [];

      reset({
        name: product.name,
        description: product.description || '',
        brandId: typeof product.brand === 'object' && product.brand ? product.brand.id.toString() : '',
        categoryId: typeof product.category === 'object' && product.category ? product.category.id.toString() : '',
        qualityId: typeof product.quality === 'object' && product.quality ? product.quality.id.toString() : '',
        isActive: product.isActive ?? true,
        variants: variants.map((v: ProductVariant) => ({
          id: v.id,
          presentationId: typeof v.presentation === 'object' && v.presentation ? v.presentation.id.toString() : '',
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
    });
  }, [isEditing, productId, isOpen, data, reset]);

  const handleClose = () => {
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

    if (isEditing && productId) {
      queryClient.setQueriesData({ queryKey: ['products'] }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object') return oldData;
        if (!('docs' in oldData) || !Array.isArray((oldData as Record<string, unknown>).docs)) return oldData;
        return {
          ...oldData,
          docs: (oldData as { docs: Array<Record<string, unknown>> }).docs.map((cacheVariant) => {
            if ((cacheVariant.product as Record<string, unknown>)?.id !== productId) return cacheVariant;

            const formVariant = data.variants.find((v) => v.id === cacheVariant.id);
            return {
              ...cacheVariant,
              product: {
                ...(cacheVariant.product as Record<string, unknown>),
                name: data.name,
                isActive: data.isActive,
              },
              ...(formVariant
                ? {
                    code: formVariant.code ?? '',
                    stock: formVariant.stock,
                    minimumStock: formVariant.minimumStock,
                    costPrice: formVariant.costPrice,
                    profitMargin: formVariant.profitMargin,
                  }
                : {}),
            };
          }),
        };
      });
    }

    if (!isEditing) {
      const tempProductId = generateTempId();
      const placeholderVariants = data.variants.map((v, i) => ({
        id: tempProductId - i - 1,
        code: v.code || '',
        stock: v.stock || 0,
        minimumStock: v.minimumStock || 0,
        costPrice: v.costPrice || 0,
        profitMargin: v.profitMargin || 0,
        product: {
          id: tempProductId,
          name: data.name,
          isActive: data.isActive,
          image: null,
          brand: null,
          category: null,
          quality: null,
        },
        presentation: {
          id: v.presentationId ? Number(v.presentationId) : 0,
          label: '',
          amount: 0,
          unit: '',
        },
      }));

      queryClient.setQueriesData({ queryKey: ['products'] }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object') return oldData;
        if (!('docs' in oldData) || !Array.isArray((oldData as Record<string, unknown>).docs)) return oldData;
        const data = oldData as { docs: unknown[]; totalDocs: number };
        return {
          ...data,
          docs: [...data.docs, ...placeholderVariants],
          totalDocs: data.totalDocs + placeholderVariants.length,
        };
      });
    }

    handleClose();

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

        const deleteResults = await Promise.all(
          variantsToDelete.map((variantId) => deleteVariantAction({ id: variantId })),
        );
        const deleteError = deleteResults.find((r) => r?.serverError);
        if (deleteError) {
          toast.error(`Error al eliminar variante: ${deleteError.serverError}`);
          return;
        }

        const variantResults = await Promise.all(
          data.variants.map((variant) => {
            if (variant.id) {
              return updateVariantAction({
                id: variant.id,
                code: variant.code || '',
                ...(variant.presentationId && { presentation: parseInt(variant.presentationId) }),
                stock: variant.stock,
                minimumStock: variant.minimumStock,
                costPrice: variant.costPrice,
                profitMargin: variant.profitMargin,
              });
            }
            return createVariantAction({
              code: variant.code || '',
              product: productId,
              ...(variant.presentationId && { presentation: parseInt(variant.presentationId) }),
              stock: variant.stock,
              minimumStock: variant.minimumStock,
              costPrice: variant.costPrice,
              profitMargin: variant.profitMargin,
            });
          }),
        );
        const variantError = variantResults.find((r) => r?.serverError);
        if (variantError) {
          toast.error(`Error al guardar variante: ${variantError.serverError}`);
          return;
        }

        queryClient.setQueriesData({ queryKey: ['products'] }, (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object') return oldData;
          if (!('docs' in oldData) || !Array.isArray((oldData as Record<string, unknown>).docs)) return oldData;
          return {
            ...oldData,
            docs: (oldData as { docs: Array<Record<string, unknown>> }).docs.map((cacheVariant) => {
              if ((cacheVariant.product as Record<string, unknown>)?.id !== productId) return cacheVariant;

              const formVariant = data.variants.find((v) => v.id === cacheVariant.id);

              const serverVariant = formVariant?.id
                ? variantResults.find((r) => r.data?.variant?.id === formVariant.id)?.data?.variant
                : undefined;

              return {
                ...cacheVariant,
                product: {
                  ...(cacheVariant.product as Record<string, unknown>),
                  name: data.name,
                  isActive: data.isActive,
                },
                ...(serverVariant
                  ? {
                      code: serverVariant.code,
                      stock: serverVariant.stock,
                      minimumStock: serverVariant.minimumStock,
                      costPrice: serverVariant.costPrice,
                      profitMargin: serverVariant.profitMargin,
                    }
                  : formVariant
                    ? {
                        code: formVariant.code ?? '',
                        stock: formVariant.stock,
                        minimumStock: formVariant.minimumStock,
                        costPrice: formVariant.costPrice,
                        profitMargin: formVariant.profitMargin,
                      }
                    : {}),
              };
            }),
          };
        });
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

        const createResults = await Promise.all(
          data.variants.map((variant) =>
            createVariantAction({
              code: variant.code || '',
              product: newProductId,
              ...(variant.presentationId && { presentation: parseInt(variant.presentationId) }),
              stock: variant.stock,
              minimumStock: variant.minimumStock,
              costPrice: variant.costPrice,
              profitMargin: variant.profitMargin,
            }),
          ),
        );
        const createError = createResults.find((r) => r?.serverError);
        if (createError) {
          toast.error(`Error al crear variante: ${createError.serverError}`);
          return;
        }

        const realVariants = createResults.map((r) => r.data!.variant);

        queryClient.setQueriesData({ queryKey: ['products'] }, (oldData: unknown) => {
          if (!oldData || typeof oldData !== 'object') return oldData;
          if (!('docs' in oldData) || !Array.isArray((oldData as Record<string, unknown>).docs)) return oldData;
          const existing = oldData as { docs: Array<Record<string, unknown>> };

          let replacedCount = 0;
          const newDocs = existing.docs.map((v) => {
            const variant = v as { product: { id: number; name: string } };
            if (
              typeof variant.product?.id === 'number' &&
              variant.product.id < 0 &&
              variant.product.name === data.name &&
              replacedCount < realVariants.length
            ) {
              const real = realVariants[replacedCount];
              replacedCount++;
              return real;
            }
            return v;
          });

          if (replacedCount === 0) return oldData;

          return { ...existing, docs: newDocs };
        });
      }
      reset(EMPTY_FORM);
      setVariantsToDelete([]);
      resetImageState();
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
