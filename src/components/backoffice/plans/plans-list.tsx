import { CreditCard, Lock } from 'lucide-react';

import type { PlanVersionSummary, PlanVersionsByCode } from '@/app/services/backoffice/plans';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getMonthlyPriceUsd } from '@/lib/entitlements/plan-presets';
import { formatUsdMonthlyPrice } from '@/lib/money';

import { PublishPlanDialog } from './publish-plan-dialog';

interface PlansListProps {
  initialData: PlanVersionsByCode;
}

const PLAN_SECTIONS: Array<{ key: keyof PlanVersionsByCode; label: string; description: string }> = [
  { key: 'basic', label: 'Basic', description: 'Plan inicial para negocios que recién comienzan.' },
  { key: 'medium', label: 'Medium', description: 'Capacidades intermedias para negocios en crecimiento.' },
  { key: 'professional', label: 'Professional', description: 'Plan completo para negocios en escala.' },
];

export function PlansList({ initialData }: PlansListProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-1 px-4 pt-2 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-semibold">Versiones publicadas</h2>
          <p className="text-sm text-muted-foreground">
            Cada versión es inmutable. Publicá una nueva para cambiar capacidades o cuotas.
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
          {versions.map((version) => (
            <PlanVersionCard key={version.id} version={version} />
          ))}
        </div>
      )}
    </section>
  );
}

function PlanVersionCard({ version }: { version: PlanVersionSummary }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">v{version.version}</CardTitle>
          <Badge variant="outline">
            <Lock />
            Inmutable
          </Badge>
        </div>
        <CardDescription>Publicada el {formatDate(version.publishedAt)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Capacidades</p>
          <div className="flex flex-wrap gap-1">
            {version.capabilities.map((capability) => (
              <Badge key={capability} variant="secondary" className="text-[10px]">
                {capability}
              </Badge>
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

        {version.createdBy !== null && (
          <p className="text-xs text-muted-foreground">Publicada por usuario #{version.createdBy}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
