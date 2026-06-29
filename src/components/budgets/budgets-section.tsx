'use client';

import { isPast } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Inbox,
  Pencil,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useAction } from 'next-safe-action/hooks';
import { Fragment, memo, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { BudgetRow } from '@/app/services/budgets';
import { PageHeader } from '@/components/layout/page-header';
import { useUser } from '@/components/providers/user-provider';
import { ActionMenu } from '@/components/ui/action-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnVisibilityDropdown } from '@/components/ui/column-visibility-dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSettings } from '@/contexts/settings-context';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import { DEFAULT_ITEMS_PER_PAGE, ITEMS_PER_PAGE_OPTIONS, type ItemsPerPageOption } from '@/lib/constants/table-columns';
import { usePersistedLimit } from '@/lib/hooks/use-persisted-limit';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatDateParts, formatShortDate } from '@/lib/utils';

import { deleteBudgetAction, getBudgetsAction } from './actions';
import { BudgetConvertDialog } from './budget-convert-dialog';
import { NewBudgetButton } from './new-budget-button';
import { NewBudgetDialog } from './new-budget-dialog';

function formatPrice(value: number): string {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getWhatsAppLink(budget: BudgetRow, businessName: string | null): string {
  const name = businessName?.trim() || 'Flowy';
  const total = formatPrice(budget.total);

  const intro = budget.validUntil
    ? `Hola! desde ${name} le informamos el detalle de su pedido con vencimiento el ${formatShortDate(budget.validUntil)} y un total de $ ${total}`
    : `Hola! desde ${name} le informamos el detalle de su pedido con un total de $ ${total}`;

  const lines: string[] = [intro, ''];

  for (let i = 0; i < budget.items.length; i++) {
    const item = budget.items[i];
    lines.push(`- ${item.variantName} x${item.quantity} - $ ${formatPrice(item.unitPrice)}`);
    if (i < budget.items.length - 1) {
      lines.push('');
    }
  }

  if (budget.notes) {
    lines.push('');
    lines.push(`Notas: ${budget.notes}`);
  }

  lines.push('');
  lines.push('Mensaje enviado desde www.flowy.ar - Sistema de gestión');

  const text = encodeURIComponent(lines.join('\n'));

  if (budget.clientPhone) {
    const phone = budget.clientPhone.replace(/\D/g, '');
    return `https://wa.me/${phone}?text=${text}`;
  }

  return `https://wa.me/?text=${text}`;
}

function StatusBadge({ status }: { status: BudgetRow['status'] }) {
  if (status === 'approved') return <Badge variant="success">Aprobado</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rechazado</Badge>;
  if (status === 'converted') return <Badge variant="default">Convertido</Badge>;
  return <Badge variant="warning">Pendiente</Badge>;
}

type SortKey = 'date' | 'seller' | 'client' | 'items' | 'total' | 'status';

function getSortValue(budget: BudgetRow, key: SortKey): string | number {
  switch (key) {
    case 'date':
      return budget.date;
    case 'seller':
      return budget.sellerName ?? '';
    case 'client':
      return budget.clientName ?? '';
    case 'items':
      return budget.itemCount;
    case 'total':
      return budget.total;
    case 'status':
      return budget.status;
  }
}

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey | null; sortDir: 'asc' | 'desc' }) {
  if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
  return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
}

interface SortableHeadProps {
  column: SortKey;
  label: string;
  className?: string;
  sortKey: SortKey | null;
  sortDir: 'asc' | 'desc';
  onSort: (key: string) => void;
}

const SortableHead = memo(function SortableHead({
  column,
  label,
  className,
  sortKey,
  sortDir,
  onSort,
}: SortableHeadProps) {
  return (
    <TableHead
      className={className}
      aria-sort={sortKey === column ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'flex items-center gap-1 hover:text-foreground transition-colors',
          className?.includes('text-right') && 'w-full justify-end',
        )}
      >
        {label}
        <SortIcon column={column} sortKey={sortKey} sortDir={sortDir} />
      </button>
    </TableHead>
  );
});

interface BudgetsSectionProps {
  initialBudgets: { success: true; budgets: BudgetRow[] };
}

function BudgetsSectionComponent({ initialBudgets }: BudgetsSectionProps) {
  const user = useUser();
  const isOwner = user?.role === 'owner';
  const { invalidateQueries } = useInvalidateQueries();

  const { data } = useServerActionQuery({
    queryKey: queryKeys.budgets.list(),
    queryFn: () => getBudgetsAction(),
    initialData: initialBudgets,
    staleTime: 10_000,
  });

  const budgetsData = data?.budgets ?? initialBudgets.budgets;

  const { getVisibleColumns } = useSettings();
  const visibleColumns = getVisibleColumns('budgets');

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePersistedLimit('flowy:budgets:limit', DEFAULT_ITEMS_PER_PAGE);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [convertingBudgetId, setConvertingBudgetId] = useState<number | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | undefined>(undefined);
  const [dialogKey, setDialogKey] = useState(0);

  const { executeAsync: executeDelete, isExecuting: isDeleting } = useAction(deleteBudgetAction);

  const handleOpenNew = () => {
    setEditingBudgetId(undefined);
    setDialogKey((k) => k + 1);
    setIsNewDialogOpen(true);
  };

  const handleOpenEdit = (budgetId: number) => {
    setEditingBudgetId(budgetId);
    setDialogKey((k) => k + 1);
    setIsNewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsNewDialogOpen(false);
    setEditingBudgetId(undefined);
  };

  const handleDialogSuccess = () => {
    invalidateQueries([queryKeys.budgets.list()]);
  };

  const handleDelete = async (budgetId: number) => {
    const result = await executeDelete({ budgetId });
    setDeleteConfirmId(null);

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    if (result?.data?.success) {
      toast.warning('Presupuesto eliminado');
      invalidateQueries([queryKeys.budgets.list()]);
    }
  };

  const handleWhatsApp = (budget: BudgetRow) => {
    const businessName = user?.businessName ?? null;
    window.open(getWhatsAppLink(budget, businessName), '_blank');
  };

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key as SortKey);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sortedBudgets = useMemo(() => {
    if (!sortKey) return budgetsData;
    return [...budgetsData].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [budgetsData, sortKey, sortDir]);

  const filteredBudgets = useMemo(() => {
    if (statusFilter === 'all') return sortedBudgets;
    return sortedBudgets.filter((b) => b.status === statusFilter);
  }, [sortedBudgets, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBudgets.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedBudgets = filteredBudgets.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const visibleOptionalCount = (
    ['date', 'seller', 'client', 'phone', 'items', 'total', 'validUntil', 'status'] as const
  ).filter((k) => visibleColumns.includes(k)).length;
  const totalCols = visibleOptionalCount + 2;

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Presupuestos"
        description="Cotizaciones y presupuestos para clientes"
        actions={<NewBudgetButton onOpen={handleOpenNew} />}
      />

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-2 pt-1">
          <div className="ml-auto">
            <ColumnVisibilityDropdown tableName="budgets" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl bg-card shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-200">
                <TableHeader>
                  <TableRow>
                    {visibleColumns.includes('date') && (
                      <SortableHead
                        column="date"
                        label="Fecha"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="w-px"
                      />
                    )}
                    {visibleColumns.includes('seller') && (
                      <SortableHead
                        column="seller"
                        label="Vendedor"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    )}
                    {visibleColumns.includes('client') && (
                      <SortableHead
                        column="client"
                        label="Cliente"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    )}
                    {visibleColumns.includes('phone') && <TableHead className="w-px">Teléfono</TableHead>}
                    {visibleColumns.includes('items') && (
                      <SortableHead
                        column="items"
                        label="Ítems"
                        className="w-px text-center"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    )}
                    {visibleColumns.includes('total') && (
                      <SortableHead
                        column="total"
                        label="Total"
                        className="w-px text-right"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    )}
                    {visibleColumns.includes('validUntil') && <TableHead className="w-px">Vencimiento</TableHead>}
                    {visibleColumns.includes('status') && (
                      <SortableHead
                        column="status"
                        label="Estado"
                        className="w-px"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    )}
                    <TableHead className="w-px" />
                    <TableHead className="w-px" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBudgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={totalCols}>
                        <EmptyState
                          icon={Inbox}
                          title="No hay presupuestos"
                          description="No se encontraron presupuestos registrados."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedBudgets.map((budget) => {
                      const isExpired =
                        budget.status === 'pending' && budget.validUntil && isPast(new Date(budget.validUntil));
                      const isExpanded = expandedId === budget.id;
                      const canManage = isOwner || budget.sellerName === user?.name;

                      return (
                        <Fragment key={budget.id}>
                          <TableRow
                            className={cn(
                              'cursor-pointer hover:bg-muted/50 animate-in fade-in duration-150',
                              isExpanded && 'border-b-0',
                            )}
                            onClick={() => toggleExpand(budget.id)}
                          >
                            {visibleColumns.includes('date') && (
                              <TableCell className="whitespace-nowrap">
                                {(() => {
                                  const { date, time } = formatDateParts(budget.date);
                                  return (
                                    <div className="flex flex-col leading-snug">
                                      <span className="text-sm text-foreground">{date}</span>
                                      <span className="text-xs text-muted-foreground">{time}</span>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                            )}
                            {visibleColumns.includes('seller') && (
                              <TableCell className="font-medium">{budget.sellerName}</TableCell>
                            )}
                            {visibleColumns.includes('client') && (
                              <TableCell className="text-muted-foreground">
                                {budget.clientName ?? 'Sin registrar'}
                              </TableCell>
                            )}
                            {visibleColumns.includes('phone') && (
                              <TableCell className="text-muted-foreground">{budget.clientPhone ?? '-'}</TableCell>
                            )}
                            {visibleColumns.includes('items') && (
                              <TableCell className="text-center tabular-nums">{budget.itemCount}</TableCell>
                            )}
                            {visibleColumns.includes('total') && (
                              <TableCell className="text-right font-medium tabular-nums">
                                $ {formatPrice(budget.total)}
                              </TableCell>
                            )}
                            {visibleColumns.includes('validUntil') && (
                              <TableCell className="text-muted-foreground">
                                {budget.validUntil ? (
                                  <span className={cn(isExpired && 'text-destructive font-medium')}>
                                    {formatShortDate(budget.validUntil)}
                                    {isExpired && ' · Vencido'}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            )}
                            {visibleColumns.includes('status') && (
                              <TableCell>
                                <StatusBadge status={budget.status} />
                              </TableCell>
                            )}
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <ActionMenu
                                items={[
                                  {
                                    label: 'Compartir por WhatsApp',
                                    icon: FileText,
                                    onClick: () => handleWhatsApp(budget),
                                  },
                                  budget.status === 'pending' && {
                                    label: 'Convertir a venta',
                                    icon: ShoppingCart,
                                    onClick: () => setConvertingBudgetId(budget.id),
                                  },
                                  canManage && budget.status === 'pending'
                                    ? {
                                        label: 'Editar',
                                        icon: Pencil,
                                        onClick: () => handleOpenEdit(budget.id),
                                      }
                                    : null,
                                  canManage
                                    ? {
                                        label: 'Eliminar',
                                        icon: Trash2,
                                        onClick: () => setDeleteConfirmId(budget.id),
                                        variant: 'destructive' as const,
                                      }
                                    : null,
                                ]}
                              />
                            </TableCell>
                            <TableCell className="text-right pr-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(budget.id);
                                }}
                              >
                                <ChevronDown
                                  className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', {
                                    'rotate-180': isExpanded,
                                  })}
                                />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="hover:bg-transparent">
                              <TableCell colSpan={totalCols} className="px-3 sm:px-6 pb-4 pt-0 bg-muted/30">
                                <div className="rounded-xl bg-background p-3 sm:p-4 shadow-sm space-y-2">
                                  {budget.items.map((item, i) => (
                                    <div
                                      key={i}
                                      className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_120px_120px] gap-1 sm:gap-3 sm:items-center rounded-lg border bg-card px-3 py-2.5 sm:px-4 sm:py-3 text-sm"
                                    >
                                      <div className="min-w-0">
                                        <p className="font-medium truncate">{item.variantName}</p>
                                      </div>
                                      <div className="flex sm:block justify-between sm:text-center text-muted-foreground">
                                        <span className="sm:hidden text-xs">Cantidad: </span>
                                        <span className="tabular-nums">{item.quantity}</span>
                                      </div>
                                      <div className="flex sm:block justify-between sm:text-right text-muted-foreground">
                                        <span className="sm:hidden text-xs">Precio unit.: </span>
                                        <span className="tabular-nums">$ {formatPrice(item.unitPrice)}</span>
                                      </div>
                                      <div className="flex sm:block justify-between sm:text-right">
                                        <span className="sm:hidden text-xs text-muted-foreground">Subtotal: </span>
                                        <span className="tabular-nums font-medium">$ {formatPrice(item.subtotal)}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {budget.notes && (
                                    <div className="rounded-lg border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
                                      <p className="text-xs text-muted-foreground mb-0.5">Notas</p>
                                      <p className="text-sm">{budget.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Filas por página</span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(v) => {
                  setItemsPerPage(Number(v) as ItemsPerPageOption);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filas por página" className="h-9 w-auto px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">Filtrar:</span>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Filtrar por estado" className="h-9 w-auto px-3">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="approved">Aprobado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span>
                {filteredBudgets.length === 0 ? (
                  '0 resultados'
                ) : (
                  <>
                    <span className="sm:hidden">
                      {safePage}/{totalPages}
                    </span>
                    <span className="hidden sm:inline">
                      {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, filteredBudgets.length)} de{' '}
                      {filteredBudgets.length}
                    </span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={safePage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={safePage >= totalPages}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <BudgetConvertDialog
        budgetId={convertingBudgetId ?? 0}
        isOpen={convertingBudgetId !== null}
        onClose={() => setConvertingBudgetId(null)}
      />

      <NewBudgetDialog
        key={dialogKey}
        isOpen={isNewDialogOpen}
        onClose={handleCloseDialog}
        onSuccess={handleDialogSuccess}
        editBudgetId={editingBudgetId}
      />

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El presupuesto se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteConfirmId !== null && void handleDelete(deleteConfirmId)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const BudgetsSection = memo(BudgetsSectionComponent);
