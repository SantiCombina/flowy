'use client';

import { Mail, Smartphone, UserCircle } from 'lucide-react';

import type { TenantSellerRow } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';

interface TabSellersProps {
  sellers: TenantSellerRow[];
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function TabSellers({ sellers }: TabSellersProps) {
  const columns: Column<TenantSellerRow>[] = [
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle className="h-4 w-4" />
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortValue: (row) => row.email,
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          <span>{row.email}</span>
        </div>
      ),
    },
    {
      key: 'isMobile',
      header: 'Modalidad',
      className: 'w-px',
      cell: (row) =>
        row.isMobile ? (
          <Badge variant="info">
            <Smartphone />
            Móvil
          </Badge>
        ) : (
          <Badge variant="outline">Fijo</Badge>
        ),
    },
    {
      key: 'createdAt',
      header: 'Alta',
      sortable: true,
      sortValue: (row) => row.createdAt,
      className: 'w-px',
      cell: (row) => <div className="text-xs text-muted-foreground">{formatShortDate(row.createdAt)}</div>,
    },
  ];

  if (sellers.length === 0) {
    return <EmptyState icon={UserCircle} title="Este tenant no tiene vendedores" />;
  }

  return (
    <DataTable<TenantSellerRow>
      data={sellers}
      columns={columns}
      keyExtractor={(row) => row.id}
      emptyMessage="Sin vendedores"
    />
  );
}
