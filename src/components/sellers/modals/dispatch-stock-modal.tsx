'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import type { User } from '@/payload-types';

import { dispatchStockAction } from '../actions';

interface DispatchStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seller: User | null;
  variants: PopulatedProductVariant[];
}

export function DispatchStockModal({ isOpen, onClose, onSuccess, seller, variants }: DispatchStockModalProps) {
  const queryClient = useQueryClient();
  const { executeAsync } = useAction(dispatchStockAction);
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const handleQuantityChange = (variantId: number, value: string) => {
    setQuantities((prev) => ({ ...prev, [variantId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;

    const items = Object.entries(quantities)
      .filter(([, qty]) => qty && parseInt(qty, 10) > 0)
      .map(([variantId, qty]) => ({
        variantId: parseInt(variantId, 10),
        quantity: parseInt(qty, 10),
      }));

    if (items.length === 0) {
      toast.error('Debe ingresar al menos una cantidad para despachar');
      return;
    }

    handleClose();

    queryClient.setQueriesData({ queryKey: ['products'] }, (oldData: unknown) => {
      if (!oldData || typeof oldData !== 'object') return oldData;
      if (!('docs' in oldData) || !Array.isArray((oldData as Record<string, unknown>).docs)) return oldData;
      return {
        ...oldData,
        docs: (oldData as { docs: Array<{ id: number; stock: number }> }).docs.map((variant) => {
          const item = items.find((i) => i.variantId === variant.id);
          return item ? { ...variant, stock: Math.max(0, variant.stock - item.quantity) } : variant;
        }),
      };
    });

    const result = await executeAsync({ sellerId: seller.id, items });

    if (result?.serverError || result?.validationErrors) {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.error(result?.serverError ?? 'Error de validación');
      return;
    }

    if (result?.data?.success) {
      const zeroStockItems = items
        .filter((item) => {
          const v = variants.find((var_) => var_.id === item.variantId);
          return v && v.stock - item.quantity === 0;
        })
        .map((item) => {
          const v = variants.find((var_) => var_.id === item.variantId);
          return v?.product.name ?? '';
        })
        .filter(Boolean);
      for (const productName of zeroStockItems) {
        toast.warning(`Depósito sin stock de ${productName}`);
      }
      if (zeroStockItems.length === 0) {
        toast.success('Stock despachado');
      }
      queryClient.invalidateQueries({
        queryKey: ['products'],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: ['sellers'],
        refetchType: 'none',
      });
      queryClient.invalidateQueries({
        queryKey: ['mobileInventory'],
        refetchType: 'none',
      });
      onSuccess();
    }
  };

  const handleClose = () => {
    setQuantities({});
    onClose();
  };

  const variantsWithStock = variants.filter((v) => v.stock > 0);

  if (!seller) return null;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-lg">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5" />
          Despachar stock a {seller.name}
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Ingresá las cantidades a enviar con el vendedor móvil. Solo se mostrarán productos con stock disponible en el
          depósito.
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ResponsiveModalBody className="space-y-3">
          {variantsWithStock.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay productos con stock disponible en el depósito.
            </p>
          ) : (
            variantsWithStock.map((variant) => {
              const productName = variant.product.name;
              const presentationName =
                variant.presentation && typeof variant.presentation === 'object'
                  ? (variant.presentation.label ?? '')
                  : '';

              return (
                <div
                  key={variant.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {productName}
                      {presentationName && <span className="text-muted-foreground"> · {presentationName}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Stock depósito: {variant.stock}</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <Label className="sr-only">Cantidad</Label>
                    <Input
                      type="number"
                      min="0"
                      max={variant.stock}
                      step="1"
                      placeholder="0"
                      value={quantities[variant.id] ?? ''}
                      onChange={(e) => handleQuantityChange(variant.id, e.target.value)}
                      className="text-center"
                    />
                  </div>
                </div>
              );
            })
          )}
        </ResponsiveModalBody>

        <ResponsiveModalFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={variantsWithStock.length === 0}>
            Confirmar despacho
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModal>
  );
}
