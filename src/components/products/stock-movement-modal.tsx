'use client';

import { PackagePlus } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { toast } from 'sonner';

import type { PopulatedProductVariant } from '@/app/services/products';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { registerStockMovementAction } from './stock-actions';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  variant: PopulatedProductVariant | null;
  onSuccess?: (variantId: number, newStock: number) => void;
}

const movementTypes = [
  { value: 'entry', label: '↑ Entrada (compra/reposición)' },
  { value: 'exit', label: '↓ Salida (merma/daño)' },
  { value: 'adjustment', label: '🔄 Ajuste de inventario' },
] as const;

export function StockMovementModal({ isOpen, onClose, variant, onSuccess }: StockMovementModalProps) {
  const [type, setType] = useState<'entry' | 'exit' | 'adjustment' | ''>('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const { executeAsync, isExecuting } = useAction(registerStockMovementAction);

  const handleClose = () => {
    setType('');
    setQuantity('');
    setReason('');
    onClose();
  };

  // Calculate preview of new stock
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
      onSuccess?.(variant.id, result.data.newStock);
      handleClose();
    }
  };

  if (!variant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Registrar movimiento de stock
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product info */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-sm font-medium">
              {variant.product.name} - {variant.presentation.label}
            </p>
            <p className="text-sm text-muted-foreground">Stock actual: {variant.stock} unidades</p>
          </div>

          {/* Movement type */}
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
                    {mt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
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
            {type && (
              <p className="text-sm text-muted-foreground">
                {type === 'adjustment'
                  ? 'Ingresa el nuevo stock total'
                  : type === 'entry'
                    ? 'Cantidad a agregar al stock'
                    : type === 'exit'
                      ? 'Cantidad a restar del stock'
                      : ''}
              </p>
            )}
          </div>

          {/* Preview */}
          {newStock !== null && (
            <div
              className={`rounded-lg border p-3 ${
                newStock < 0 ? 'border-destructive bg-destructive/10' : 'border-primary bg-primary/10'
              }`}
            >
              <p className="text-sm font-medium">
                Nuevo stock: {newStock} unidades
                {newStock < 0 && <span className="ml-2 text-destructive">(Stock negativo no permitido)</span>}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Compra a proveedor X, Producto vencido, Inventario físico..."
              maxLength={500}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">Opcional - Describe el motivo del movimiento</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isExecuting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || isExecuting}>
              {isExecuting ? 'Registrando...' : 'Registrar movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
