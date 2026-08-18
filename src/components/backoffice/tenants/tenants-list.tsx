'use client';

import { Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useState } from 'react';

import type { ListTenantsResult } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { useInvalidateQueries } from '@/hooks/use-invalidate-queries';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

import { listTenantsAction } from './actions';
import { TenantsTableToolbar, type PlanFilterValue, type StateFilterValue } from './tenants-table-toolbar';

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

const STATE_LABELS: Record<string, string> = {
  provisioning: 'En provisioning',
  active: 'Activo',
  blocked: 'Bloqueado',
};

const STATE_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  provisioning: 'warning',
  active: 'success',
  blocked: 'error',
};

const PLAN_BADGE_VARIANT: Record<string, 'info' | 'violet' | 'sky'> = {
  basic: 'info',
  medium: 'violet',
  professional: 'sky',
};

type TenantRow = ListTenantsResult['docs'][number];

interface TenantsListProps {
  initialData: ListTenantsResult;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function TenantsList({ initialData }: TenantsListProps) {
  const { invalidateQueries } = useInvalidateQueries();
  const [search, setSearch] = useState('');
  const [planCode, setPlanCode] = useState<PlanFilterValue>('all');
  const [state, setState] = useState<StateFilterValue>('all');
  const [data, setData] = useState<ListTenantsResult>(initialData);

  const { execute: refetch, isExecuting } = useAction(listTenantsAction, {
    onSuccess: ({ data: result }) => {
      if (result?.success) {
        setData(result.data);
        invalidateQueries([queryKeys.adminBackoffice.tenants.list({})]);
      }
    },
  });

  useEffect(() => {
    const trimmed = search.trim();
    const params = {
      search: trimmed || undefined,
      planCode: planCode === 'all' ? undefined : planCode,
      state: state === 'all' ? undefined : state,
      page: 1,
      limit: 20,
    };
    refetch(params);
  }, [search, planCode, state, refetch]);

  const columns: Column<TenantRow>[] = [
    {
      key: 'businessName',
      header: 'Negocio',
      sortable: true,
      sortValue: (row) => row.businessName ?? '',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-medium">{row.businessName?.trim() || '—'}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortValue: (row) => row.email,
      cell: (row) => <div className="text-muted-foreground">{row.email}</div>,
    },
    {
      key: 'planCode',
      header: 'Plan',
      className: 'w-px',
      cell: (row) =>
        row.planCode ? (
          <Badge variant={PLAN_BADGE_VARIANT[row.planCode] ?? 'info'}>
            {PLAN_LABELS[row.planCode] ?? row.planCode}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'entitlementState',
      header: 'Estado',
      className: 'w-px',
      cell: (row) =>
        row.entitlementState ? (
          <Badge variant={STATE_BADGE_VARIANT[row.entitlementState] ?? 'warning'}>
            {STATE_LABELS[row.entitlementState] ?? row.entitlementState}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
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
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      cell: (row) => (
        <Link
          href={`/backoffice/tenants/${row.id}`}
          aria-label="Ver detalle del tenant"
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  const isFiltered = search.trim().length > 0 || planCode !== 'all' || state !== 'all';

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <TenantsTableToolbar
          search={search}
          planCode={planCode}
          state={state}
          onSearchChange={setSearch}
          onPlanCodeChange={setPlanCode}
          onStateChange={setState}
          totalCount={data.totalDocs}
        />

        <div className={cn('transition-opacity duration-200', isExecuting ? 'opacity-50' : 'opacity-100')}>
          {data.docs.length === 0 && !isExecuting && !isFiltered ? (
            <EmptyState icon={Building2} title="Sin tenants registrados" />
          ) : (
            <DataTable<TenantRow>
              data={data.docs}
              columns={columns}
              keyExtractor={(row) => row.id}
              emptyMessage={isFiltered ? 'No se encontraron tenants con esos filtros' : 'Sin tenants registrados'}
            />
          )}
        </div>
      </main>
    </div>
  );
}
