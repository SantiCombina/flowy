'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, ShoppingCart, XCircle } from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { BudgetConvertItem } from '@/app/services/budgets';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

import { createSaleAction } from '../sales/actions';

import { getBudgetConvertDataAction, updateBudgetStatusAction } from './actions';

interface BudgetConvertDialogProps {
  budgetId: number;
  isOpen: boolean;
  onClose: () => void;
}

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'credit', label: 'A crédito' },
] as const;

interface ItemFormValues {
  quantity: number;
  stockSource: 'warehouse' | 'personal';
}

function StockBadge({ label, stock }: { label: string; stock: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        stock === 0
          ? 'bg-muted text-muted-foreground/50 line-through'
          : stock <= 5
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
            : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400',
      )}
    >
      {label} {stock} uds.
    </span>
  );
}

function PriceDiff({ budgetPrice, currentPrice }: { budgetPrice: number; currentPrice: number }) {
  const diff = currentPrice - budgetPrice;
  if (diff === 0) return null;

  return (
    <span
      className={cn(
        'text-xs font-medium',
        diff > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
      )}
    >
      {diff > 0 ? '+' : ''}$ {formatPrice(Math.abs(diff))}
    </span>
  );
}

function ItemRow({
  item,
  control,
  index,
}: {
  item: BudgetConvertItem;
  control: ReturnType<typeof useForm<ConvertFormValues>>['control'];
  index: number;
}) {
  const [stockSource, quantity] = useWatch({
    control,
    name: [`items.${index}.stockSource`, `items.${index}.quantity`],
  }) as ['warehouse' | 'personal', number];

  const maxStock = stockSource === 'personal' ? item.personalStock : item.warehouseStock;
  const showStockWarning = quantity > maxStock;

  const subtotal = quantity * item.currentUnitPrice;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:grid sm:grid-cols-[1fr_80px_140px_140px] sm:items-center sm:gap-3">
      {/* Producto info */}
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-medium leading-snug truncate">{item.variantName}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Presup. $ {formatPrice(item.budgetUnitPrice)}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">Actual $ {formatPrice(item.currentUnitPrice)}</span>
          <PriceDiff budgetPrice={item.budgetUnitPrice} currentPrice={item.currentUnitPrice} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <StockBadge label="Depósito" stock={item.warehouseStock} />
          <StockBadge label="Mi inv." stock={item.personalStock} />
        </div>
      </div>

      {/* Cantidad */}
      <FormField
        control={control}
        name={`items.${index}.quantity`}
        render={({ field }) => (
          <FormItem>
            <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Cantidad</p>
            <FormControl>
              <Input
                type="number"
                min={1}
                step={1}
                value={field.value || ''}
                onChange={(e) => field.onChange(Math.max(1, Number(e.target.value)))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Origen */}
      <FormField
        control={control}
        name={`items.${index}.stockSource`}
        render={({ field }) => (
          <FormItem>
            <p className="text-xs font-medium text-muted-foreground mb-1 sm:hidden">Origen</p>
            <FormControl>
              <Select value={field.value} onValueChange={(v) => field.onChange(v as 'warehouse' | 'personal')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse" disabled={item.warehouseStock === 0}>
                    Depósito ({item.warehouseStock})
                  </SelectItem>
                  <SelectItem value="personal" disabled={item.personalStock === 0}>
                    Mi inventario ({item.personalStock})
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Subtotal */}
      <div className="flex items-center justify-between sm:flex-col sm:items-end">
        <p className="text-xs text-muted-foreground sm:hidden">Subtotal</p>
        <div className="text-right">
          <p className={cn('text-sm font-semibold', showStockWarning && 'text-destructive')}>
            $ {formatPrice(subtotal)}
          </p>
          {showStockWarning && (
            <p className="text-xs text-destructive whitespace-nowrap">
              {quantity > maxStock
                ? `Stock ${stockSource === 'personal' ? 'personal' : 'en depósito'} insuficiente`
                : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

type PaymentMethod = 'cash' | 'transfer' | 'check' | 'credit';

interface ConvertFormValues {
  items: ItemFormValues[];
  paymentMethod: PaymentMethod;
  checkDueDate?: string;
}

export function BudgetConvertDialog({ budgetId, isOpen, onClose }: BudgetConvertDialogProps) {
  const { invalidateQueries } = useInvalidateQueries();

  const { executeAsync: createSale } = useAction(createSaleAction);
  const { executeAsync: updateStatus } = useAction(updateBudgetStatusAction);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const { data: fetchResult, isPending: isLoading } = useServerActionQuery({
    queryKey: ['budget-convert-data', budgetId],
    queryFn: () => getBudgetConvertDataAction({ budgetId }),
    enabled: isOpen,
  });

  const convertData = fetchResult?.success && fetchResult.data ? fetchResult.data : null;
  const loadError = !isLoading && !convertData && isOpen ? 'Error al cargar el presupuesto' : null;

  const form = useForm<ConvertFormValues>({
    defaultValues: {
      items: [] as ItemFormValues[],
      paymentMethod: 'credit',
      checkDueDate: undefined,
    },
  });

  useEffect(() => {
    if (!convertData) return;

    form.reset({
      items: convertData.items.map((item) => ({
        quantity: item.quantity,
        stockSource: item.warehouseStock > 0 ? ('warehouse' as const) : ('personal' as const),
      })),
      paymentMethod: 'credit',
      checkDueDate: undefined,
    });
  }, [convertData, form]);

  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const paymentMethod = useWatch({ control: form.control, name: 'paymentMethod' });
  const total = (watchedItems ?? []).reduce(
    (sum, item, idx) => sum + (item.quantity || 0) * (convertData?.items[idx]?.currentUnitPrice ?? 0),
    0,
  );

  const handleSubmit = async () => {
    if (!convertData) return;

    const values = form.getValues();
    setServerError(null);
    setIsConverting(true);

    const saleItems = convertData.items.map((item, idx) => ({
      variantId: item.variantId,
      quantity: values.items[idx].quantity,
      unitPrice: item.currentUnitPrice,
      stockSource: values.items[idx].stockSource,
    }));

    const createResult = await createSale({
      items: saleItems,
      ...(convertData.clientId ? { clientId: convertData.clientId } : {}),
      ...(convertData.notes ? { notes: convertData.notes } : {}),
      paymentMethod: values.paymentMethod,
      ...(values.paymentMethod === 'check' && values.checkDueDate ? { checkDueDate: values.checkDueDate } : {}),
      immediateDelivery: false,
    });

    if (createResult?.serverError) {
      setServerError(createResult.serverError);
      setIsConverting(false);
      return;
    }

    if (!createResult?.data?.success) {
      setServerError('Error al crear la venta');
      setIsConverting(false);
      return;
    }

    await updateStatus({ budgetId, status: 'converted' });

    toast.success('Presupuesto convertido a venta');
    invalidateQueries([queryKeys.budgets.list(), queryKeys.sales.list()]);
    setIsConverting(false);
    onClose();
  };

  const formatTotal = (value: number) =>
    value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <ResponsiveModal open={isOpen} onOpenChange={onClose} className="sm:max-w-2xl">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>Convertir presupuesto a venta</ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Elegí el origen del stock y ajustá cantidades. Los badges verdes/ámbar indican disponibilidad.
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>

      <ResponsiveModalBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{loadError}</p>
          </div>
        ) : convertData ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {convertData.clientName && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{convertData.clientName}</span>
                </div>
              )}

              <div className="space-y-2">
                {convertData.items.map((item, idx) => (
                  <ItemRow key={item.variantId} item={item} control={form.control} index={idx} />
                ))}
              </div>

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cobro</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v !== 'check') form.setValue('checkDueDate', undefined);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {paymentMethod === 'check' && (
                <FormField
                  control={form.control}
                  name="checkDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de cobro del cheque</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground',
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(new Date(`${field.value}T12:00:00`), "d 'de' MMMM 'de' yyyy", {
                                    locale: es,
                                  })
                                : 'Seleccioná una fecha'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(`${field.value}T12:00:00`) : undefined}
                            onSelect={(date) => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {serverError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{serverError}</p>
                </div>
              )}

              <ResponsiveModalFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-base font-semibold text-primary">$ {formatTotal(total)}</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isConverting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isConverting}>
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {isConverting ? 'Creando venta…' : 'Confirmar venta'}
                  </Button>
                </div>
              </ResponsiveModalFooter>
            </form>
          </Form>
        ) : null}
      </ResponsiveModalBody>
    </ResponsiveModal>
  );
}
