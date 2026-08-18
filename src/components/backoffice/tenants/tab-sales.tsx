'use client';

import { Receipt, User } from 'lucide-react';

import type { TenantSaleRow } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/utils';

interface TabSalesProps {
  sales: TenantSaleRow[];
}

const PAYMENT_LABEL: Record<TenantSaleRow['paymentStatus'], string> = {
  pending: 'Pendiente',
  partially_collected: 'Cobrado parcial',
  collected: 'Cobrado',
};

const PAYMENT_VARIANT: Record<TenantSaleRow['paymentStatus'], 'warning' | 'success' | 'info'> = {
  pending: 'warning',
  partially_collected: 'info',
  collected: 'success',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TabSales({ sales }: TabSalesProps) {
  const columns: Column<TenantSaleRow>[] = [
    {
      key: 'id',
      header: '#',
      className: 'w-px',
      cell: (row) => <div className="text-xs text-muted-foreground tabular-nums">#{row.id}</div>,
    },
    {
      key: 'sellerName',
      header: 'Vendedor',
      cell: (row) =>
        row.sellerName ? (
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{row.sellerName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'clientName',
      header: 'Cliente',
      cell: (row) => row.clientName ?? <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      sortValue: (row) => row.total,
      className: 'w-px',
      cell: (row) => <div className="text-right font-semibold tabular-nums">{formatCurrency(row.total)}</div>,
    },
    {
      key: 'paymentStatus',
      header: 'Pago',
      className: 'w-px',
      cell: (row) => <Badge variant={PAYMENT_VARIANT[row.paymentStatus]}>{PAYMENT_LABEL[row.paymentStatus]}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      sortable: true,
      sortValue: (row) => row.createdAt,
      className: 'w-px',
      cell: (row) => <div className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</div>,
    },
  ];

  if (sales.length === 0) {
    return <EmptyState icon={Receipt} title="Este tenant no tiene ventas" />;
  }

  return (
    <DataTable<TenantSaleRow> data={sales} columns={columns} keyExtractor={(row) => row.id} emptyMessage="Sin ventas" />
  );
}
