import type { ServerProps } from 'payload';

import type { PlanVersion } from '@/payload-types';

import { changeTenantPlanFromAdmin, publishPlanVersionFromAdmin } from './plan-management-actions';
import { getOwnerOptionLabel } from './plan-management-owner-label';
import { PublishPlanVersionForm, type LatestPlanVersion } from './publish-plan-version-form';
import './plan-management.scss';

const planLabels = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
} as const;

export default async function PlanManagement({ payload, searchParams, user }: ServerProps) {
  if (user?.role !== 'admin') return null;

  const [plans, owners] = await Promise.all([
    payload.find({
      collection: 'plan-versions',
      sort: ['planCode', '-version'],
      limit: 100,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'users',
      where: { role: { equals: 'owner' } },
      sort: 'email',
      limit: 500,
      depth: 2,
      overrideAccess: true,
    }),
  ]);
  const status = firstParam(searchParams?.plansStatus);
  const error = firstParam(searchParams?.plansError);
  const latestPlans = getLatestPlans(plans.docs);

  return (
    <section className="plan-management">
      <header className="plan-management__header">
        <div>
          <span className="plan-management__eyebrow">Control de acceso</span>
          <h2>Planes y capacidades</h2>
          <p>Publicá versiones inmutables y asignalas a cada negocio.</p>
        </div>
        <div className="plan-management__metric">
          <strong>{owners.totalDocs}</strong>
          <span>negocios</span>
        </div>
      </header>

      {status && (
        <div className="plan-management__notice plan-management__notice--success">
          {status === 'published' ? 'La versión del plan fue publicada.' : 'El plan del negocio fue actualizado.'}
        </div>
      )}
      {error && <div className="plan-management__notice plan-management__notice--error">{error}</div>}

      <div className="plan-management__grid">
        <PublishPlanVersionForm action={publishPlanVersionFromAdmin} latestPlans={latestPlans} />

        <form action={changeTenantPlanFromAdmin} className="plan-management__card plan-management__card--assignment">
          <div className="plan-management__card-heading">
            <span>02</span>
            <div>
              <h3>Asignar a un negocio</h3>
              <p>La primera asignación activa el tenant; los cambios posteriores crean un snapshot.</p>
            </div>
          </div>

          <label>
            Negocio
            <select name="tenantId" required defaultValue="">
              <option value="" disabled>
                Seleccionar owner
              </option>
              {owners.docs.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {getOwnerOptionLabel(owner)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Versión del plan
            <select name="planVersionId" required defaultValue="">
              <option value="" disabled>
                Seleccionar versión
              </option>
              {plans.docs.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {planLabels[plan.planCode]} · v{plan.version}
                </option>
              ))}
            </select>
          </label>

          <div className="plan-management__summary">
            <span>{plans.totalDocs} versiones publicadas</span>
            <span>Podés subir o bajar de plan sin borrar datos del negocio.</span>
          </div>

          <button type="submit" disabled={plans.totalDocs === 0 || owners.totalDocs === 0}>
            Asignar o actualizar
          </button>
        </form>
      </div>
    </section>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getLatestPlans(plans: PlanVersion[]): LatestPlanVersion[] {
  const latestPlans = new Map<PlanVersion['planCode'], LatestPlanVersion>();

  for (const plan of plans) {
    const current = latestPlans.get(plan.planCode);

    if (!current || plan.version > current.version) {
      latestPlans.set(plan.planCode, {
        planCode: plan.planCode,
        version: plan.version,
        capabilities: plan.capabilities.map(({ capability }) => capability),
        quotas: {
          maxSellerSeats: plan.quotas.maxSellerSeats,
          maxProducts: plan.quotas.maxProducts,
          maxVariantsPerProduct: plan.quotas.maxVariantsPerProduct,
          maxVariantsPerTenant: plan.quotas.maxVariantsPerTenant,
        },
      });
    }
  }

  return [...latestPlans.values()];
}
