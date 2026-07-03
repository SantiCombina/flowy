'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpFromLine } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import type { MobileInventoryItem } from '@/app/services/mobile-seller';
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

import { returnStockAction } from '../actions';

interface ReturnStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seller: User | null;
  inventory: MobileInventoryItem[];
}

export function ReturnStockModal({ isOpen, onClose, onSuccess, seller, inventory }: ReturnStockModalProps) {
  const queryClient = useQueryClient();
  const { executeAsync } = useAction(returnStockAction);
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const handleClose = () => {
    setQuantities({});
    onClose();
  };

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
      toast.error('Debe ingresar al menos una cantidad para devolver');
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
          return item ? { ...variant, stock: variant.stock + item.quantity } : variant;
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
      toast.success('Devolución registrada correctamente');
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

  if (!seller) return null;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-lg">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle className="flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5" />
          Registrar devolución de {seller.name}
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Ingresá las cantidades que el vendedor móvil devuelve al depósito.
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ResponsiveModalBody className="space-y-3">
          {inventory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este vendedor no tiene stock en su inventario móvil.
            </p>
          ) : (
            inventory.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 shadow-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.productName}
                    {item.presentationName && <span className="text-muted-foreground"> · {item.presentationName}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">Con el vendedor: {item.quantity}</p>
                </div>
                <div className="w-24 shrink-0">
                  <Label className="sr-only">Cantidad a devolver</Label>
                  <Input
                    type="number"
                    min="0"
                    max={item.quantity}
                    step="1"
                    placeholder="0"
                    value={quantities[item.variantId] ?? ''}
                    onChange={(e) => handleQuantityChange(item.variantId, e.target.value)}
                    className="text-center"
                  />
                </div>
              </div>
            ))
          )}
        </ResponsiveModalBody>

        <ResponsiveModalFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={inventory.length === 0}>
            Confirmar devolución
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModal>
  );
}
