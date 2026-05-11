'use client';

import { ArrowUpFromLine, Loader2 } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

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
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import type { User } from '@/payload-types';

import { getMobileSellerInventoryAction, returnStockAction } from './actions';

interface ReturnStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seller: User | null;
}

export function ReturnStockModal({ isOpen, onClose, onSuccess, seller }: ReturnStockModalProps) {
  const { executeAsync, isExecuting } = useAction(returnStockAction);
  const { invalidateQueries } = useInvalidateQueries();
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const { data, isLoading } = useServerActionQuery({
    queryKey: ['mobileInventory', seller?.id],
    queryFn: () => getMobileSellerInventoryAction({ sellerId: seller!.id }),
    enabled: isOpen && !!seller,
    staleTime: 10_000,
  });

  const inventory = data?.items ?? [];

  const resetState = () => {
    setQuantities({});
  };

  const handleClose = () => {
    resetState();
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

    const result = await executeAsync({ sellerId: seller.id, items });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Devolución registrada correctamente');
      resetState();
      invalidateQueries([['sellers'], ['products'], ['mobileInventory', seller.id]]);
      onSuccess();
      onClose();
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : inventory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este vendedor no tiene stock en su inventario móvil.
            </p>
          ) : (
            inventory.map((item) => (
              <div key={item.variantId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
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
          <Button type="button" variant="outline" onClick={handleClose} disabled={isExecuting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isExecuting || isLoading || inventory.length === 0}>
            {isExecuting ? 'Registrando...' : 'Confirmar devolución'}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModal>
  );
}
