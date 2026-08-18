import { ArrowLeft, Building2, Mail } from 'lucide-react';
import Link from 'next/link';

import type { TenantDetailData } from '@/app/services/backoffice/tenants';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

const PLAN_BADGE_VARIANT: Record<string, 'info' | 'violet' | 'sky'> = {
  basic: 'info',
  medium: 'violet',
  professional: 'sky',
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

interface TenantHeaderProps {
  data: TenantDetailData;
}

export function TenantHeader({ data }: TenantHeaderProps) {
  const { owner, activePlan, stats } = data;
  const planLabel = activePlan ? (PLAN_LABELS[activePlan.planCode] ?? activePlan.planCode) : null;
  const stateLabel = owner.entitlementState ? (STATE_LABELS[owner.entitlementState] ?? owner.entitlementState) : null;

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-4 sm:px-6">
      <Link
        href="/backoffice/tenants"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a tenants
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">
              {owner.businessName?.trim() || owner.name || owner.email}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{owner.email}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {planLabel && activePlan ? (
            <Badge variant={PLAN_BADGE_VARIANT[activePlan.planCode] ?? 'info'}>
              {planLabel} · v{activePlan.version}
            </Badge>
          ) : (
            <Badge variant="outline">Sin plan</Badge>
          )}
          {stateLabel && (
            <Badge variant={owner.entitlementState ? STATE_BADGE_VARIANT[owner.entitlementState] : 'warning'}>
              {stateLabel}
            </Badge>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-xl bg-card p-4 shadow-sm">
        <Stat label="Vendedores" value={stats.sellersCount} />
        <Stat label="Productos" value={stats.productsCount} />
        <Stat label="Ventas" value={stats.salesCount} accent />
      </dl>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-2xl font-bold tabular-nums', accent && 'text-primary')}>{value}</dd>
    </div>
  );
}
