'use client';

import { PackagePlus, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { queryKeys } from '@/lib/query-keys';

import { registerStockMovementAction } from './stock-actions';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: PopulatedProductVariant | null;
  onSuccess?: (variantId: number, newStock: number) => void;
}

const movementTypes = [
  {
    value: 'entry',
    label: 'Entrada',
    icon: <ArrowUp className="text-green-600" />,
  },
  {
    value: 'exit',
    label: 'Salida',
    icon: <ArrowDown className="text-destructive" />,
  },
  {
    value: 'adjustment',
    label: 'Ajuste de inventario',
    icon: <RotateCcw className="text-orange-500" />,
  },
] as const;

export function StockMovementModal({ isOpen, onClose, variant, onSuccess }: StockMovementModalProps) {
  const [type, setType] = useState<'entry' | 'exit' | 'adjustment' | ''>('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const { invalidateQueries } = useInvalidateQueries();

  const { executeAsync, isExecuting } = useAction(registerStockMovementAction);

  const handleClose = () => {
    setType('');
    setQuantity('');
    setReason('');
    onClose();
  };

  const calculateNewStock = (): number | null => {
    if (!variant || !type || !quantity) return null;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return null;

    switch (type) {
      case 'entry':
        return variant.stock + qty;
      case 'exit':
        return variant.stock - qty;
      case 'adjustment':
        return qty;
      default:
        return null;
    }
  };

  const newStock = calculateNewStock();
  const isValid = type && quantity && newStock !== null && newStock >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!variant || !isValid) return;

    const result = await executeAsync({
      variantId: variant.id,
      type: type as 'entry' | 'exit' | 'adjustment',
      quantity: parseInt(quantity, 10),
      reason: reason.trim() || undefined,
    });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.success('Movimiento registrado correctamente');
      invalidateQueries([queryKeys.products.list('', 1), queryKeys.history.list()]);
      onSuccess?.(variant.id, result.data.newStock);
      handleClose();
    }
  };

  if (!variant) return null;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleClose} className="sm:max-w-lg">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5" />
          Registrar movimiento de stock
        </ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Completá los datos para registrar un movimiento de stock en este producto. Los campos marcados con * son
          obligatorios.
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ResponsiveModalBody className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 shadow-sm">
            <p className="text-sm font-medium">
              {variant.product.name} - {variant.presentation.label}
            </p>
            <p className="text-sm text-muted-foreground">Stock actual: {variant.stock} unidades</p>
          </div>

          <div className="space-y-2">
            <Label>
              Tipo de movimiento <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de movimiento" />
              </SelectTrigger>
              <SelectContent>
                {movementTypes.map((mt) => (
                  <SelectItem key={mt.value} value={mt.value}>
                    <span className="flex items-center gap-2">
                      {mt.icon}
                      {mt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              {type === 'adjustment' ? 'Nuevo stock' : 'Cantidad'} <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={type === 'adjustment' ? 'Ej: 50' : 'Ej: 10'}
            />
          </div>

          {newStock !== null && (
            <div className={`rounded-lg p-3 shadow-sm ${newStock < 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              <p className="text-sm font-medium">
                Nuevo stock: {newStock} unidades
                {newStock < 0 && <span className="ml-2 text-destructive">(Stock negativo no permitido)</span>}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Compra a proveedor X, Producto vencido, Inventario físico..."
              maxLength={500}
              rows={3}
            />
          </div>
        </ResponsiveModalBody>

        <ResponsiveModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isExecuting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isValid || isExecuting}>
            {isExecuting ? 'Registrando...' : 'Registrar movimiento'}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModal>
  );
}
