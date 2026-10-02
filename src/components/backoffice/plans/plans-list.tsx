import { CreditCard, History } from 'lucide-react';

import type { PlanVersionSummary, PlanVersionsByCode } from '@/app/services/backoffice/plans';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { groupCapabilitiesByDomain } from '@/lib/entitlements/capabilities';
import { getMonthlyPriceUsd } from '@/lib/entitlements/plan-presets';
import { formatUsdMonthlyPrice } from '@/lib/money';
import { formatShortDate } from '@/lib/utils';

import { PublishPlanDialog } from './publish-plan-dialog';

interface PlansListProps {
  initialData: PlanVersionsByCode;
}

const PLAN_SECTIONS: Array<{
  key: keyof PlanVersionsByCode;
  label: string;
  description: string;
}> = [
  {
    key: 'basic',
    label: 'Basic',
    description: 'Plan inicial para negocios que recién comienzan.',
  },
  {
    key: 'medium',
    label: 'Medium',
    description: 'Capacidades intermedias para negocios en crecimiento.',
  },
  {
    key: 'professional',
    label: 'Professional',
    description: 'Plan completo para negocios en escala.',
  },
];

export function PlansList({ initialData }: PlansListProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-1 px-4 pt-2 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Versiones publicadas</h2>
          <p className="text-sm text-muted-foreground">
            Editá un plan para cambiar sus capacidades o cuotas. Los cambios se aplican a todos los tenants
            automáticamente.
          </p>
        </div>
        <PublishPlanDialog />
      </div>

      <div className="flex flex-col gap-6 px-4 pb-6 sm:px-6">
        {PLAN_SECTIONS.map((section) => (
          <PlanSection
            key={section.key}
            planCode={section.key}
            label={section.label}
            description={section.description}
            versions={initialData[section.key]}
          />
        ))}
      </div>
    </div>
  );
}

interface PlanSectionProps {
  planCode: keyof PlanVersionsByCode;
  label: string;
  description: string;
  versions: PlanVersionSummary[];
}

function PlanSection({ planCode, label, description, versions }: PlanSectionProps) {
  const monthlyPrice = formatUsdMonthlyPrice(getMonthlyPriceUsd(planCode));

  return (
    <section className="space-y-3">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {monthlyPrice}
        </Badge>
      </header>

      {versions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span>Aún no hay versiones publicadas para este plan.</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {versions.map((version, index) => (
            <PlanVersionCard key={version.id} version={version} isLatest={index === 0} />
          ))}
        </div>
      )}
    </section>
  );
}

interface PlanVersionCardProps {
  version: PlanVersionSummary;
  isLatest: boolean;
}

function PlanVersionCard({ version, isLatest }: PlanVersionCardProps) {
  const groupedCapabilities = groupCapabilitiesByDomain(version.capabilities);

  return (
    <Card className={isLatest ? 'border-primary/30' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">v{version.version}</CardTitle>
            <CardDescription>Publicada el {formatShortDate(version.publishedAt)}</CardDescription>
          </div>
          {isLatest ? (
            <Badge variant="default">Vigente</Badge>
          ) : (
            <Badge variant="outline">
              <History />
              Histórico
            </Badge>
          )}
        </div>
        {isLatest && (
          <div className="pt-2">
            <PublishPlanDialog initialVersion={version} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Capacidades</p>
          <div className="flex flex-col gap-2">
            {groupedCapabilities.map((group) => (
              <div key={group.group} className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((meta) => (
                    <Badge key={meta.key} variant="secondary" className="text-[10px]">
                      {meta.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Cuotas</p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            <li>Asientos de vendedor: {version.quotas.maxSellerSeats}</li>
            <li>Productos: {version.quotas.maxProducts}</li>
            <li>Variantes por producto: {version.quotas.maxVariantsPerProduct}</li>
            <li>Variantes totales: {version.quotas.maxVariantsPerTenant}</li>
          </ul>
        </div>

        {version.createdByName !== null && (
          <p className="text-xs text-muted-foreground">Publicada por {version.createdByName}</p>
        )}
      </CardContent>
    </Card>
  );
}
