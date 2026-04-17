'use client';

import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

import { bulkUpdateVariantPricesAction } from './actions';

interface BulkPriceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  variants: PopulatedProductVariant[];
  onSuccess: () => void;
}

interface PriceRow {
  variantId: number;
  costPrice: number;
  profitMargin: number;
}

export function BulkPriceSheet({ isOpen, onClose, variants, onSuccess }: BulkPriceSheetProps) {
  const isMobile = useIsMobile();
  const side = isMobile ? 'bottom' : 'right';

  const [rows, setRows] = useState<PriceRow[]>(() =>
    variants.map((v) => ({
      variantId: v.id,
      costPrice: v.costPrice,
      profitMargin: v.profitMargin ?? 0,
    })),
  );
  const [percentage, setPercentage] = useState('');

  const { executeAsync, isExecuting } = useAction(bulkUpdateVariantPricesAction);

  const applyPercentage = () => {
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct === 0) return;
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        costPrice: Math.max(0.01, parseFloat((r.costPrice * (1 + pct / 100)).toFixed(2))),
      })),
    );
  };

  const updateCostPrice = (variantId: number, value: number) => {
    setRows((prev) => prev.map((r) => (r.variantId === variantId ? { ...r, costPrice: value } : r)));
  };

  const handleSave = async () => {
    const result = await executeAsync({
      updates: rows.map((r) => ({ variantId: r.variantId, costPrice: r.costPrice })),
    });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success(`${result.data.updated} variantes actualizadas`);
      onSuccess();
      onClose();
    } else {
      toast.error('No se pudieron actualizar los precios');
    }
  };

  const getRow = (variantId: number): PriceRow | undefined => rows.find((r) => r.variantId === variantId);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={side} className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl max-h-[85dvh] sm:max-h-none">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Editar precios ({variants.length} variantes)</SheetTitle>
        </SheetHeader>

        <div className="border-b bg-muted/30 px-6 py-4">
          <p className="mb-3 text-sm font-medium">Aumentar precio de costo a todas</p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                type="number"
                placeholder="0"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-28 pr-7"
                min="-99"
                step="0.1"
              />
              <span className="absolute right-2.5 top-2 text-sm text-muted-foreground">%</span>
            </div>
            <Button variant="secondary" size="sm" onClick={applyPercentage} disabled={!percentage || isExecuting}>
              Aplicar a todas
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Presentación</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Precio costo</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Margen</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Precio venta</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {variants.map((v) => {
                const row = getRow(v.id);
                const costPrice = row?.costPrice ?? v.costPrice;
                const profitMargin = row?.profitMargin ?? v.profitMargin ?? 0;
                const sellingPrice = costPrice * (1 + profitMargin / 100);

                return (
                  <tr key={v.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{v.product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.presentation?.label ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        value={costPrice}
                        onChange={(e) => updateCostPrice(v.id, Math.max(0.01, parseFloat(e.target.value) || 0))}
                        className="h-8 w-28"
                        step="0.01"
                        min="0"
                        disabled={isExecuting}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{profitMargin}%</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className="whitespace-nowrap">
                        ${' '}
                        {sellingPrice.toLocaleString('es-AR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isExecuting || rows.length === 0}>
            {isExecuting ? 'Guardando...' : `Guardar ${variants.length} variantes`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
