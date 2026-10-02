'use client';

import { Building2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { ListTenantsResult } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { normalizeText } from '@/lib/text';
import { cn, formatShortDate } from '@/lib/utils';

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

export function TenantsList({ initialData }: TenantsListProps) {
  const [search, setSearch] = useState('');
  const [planCode, setPlanCode] = useState<PlanFilterValue>('all');
  const [state, setState] = useState<StateFilterValue>('all');

  const filteredDocs = useMemo(() => {
    let result = initialData.docs;
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const q = normalizeText(trimmedSearch);
      result = result.filter(
        (row) => normalizeText(row.businessName ?? '').includes(q) || normalizeText(row.email).includes(q),
      );
    }
    if (planCode !== 'all') {
      result = result.filter((row) => row.planCode === planCode);
    }
    if (state !== 'all') {
      result = result.filter((row) => row.entitlementState === state);
    }
    return result;
  }, [initialData.docs, search, planCode, state]);

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
          totalCount={initialData.totalDocs}
        />

        {filteredDocs.length === 0 && !isFiltered ? (
          <EmptyState icon={Building2} title="Sin tenants registrados" />
        ) : (
          <DataTable<TenantRow>
            data={filteredDocs}
            columns={columns}
            keyExtractor={(row) => row.id}
            emptyMessage={isFiltered ? 'No se encontraron tenants con esos filtros' : 'Sin tenants registrados'}
          />
        )}
      </main>
    </div>
  );
}
