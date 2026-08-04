'use client';

import { useState } from 'react';

import { CAPABILITIES, type Capability, type PlanCode } from '@/lib/entitlements/capabilities';

const planLabels: Record<PlanCode, string> = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
};

interface PlanQuotas {
  maxSellerSeats: number;
  maxProducts: number;
  maxVariantsPerProduct: number;
  maxVariantsPerTenant: number;
}

export interface LatestPlanVersion {
  planCode: PlanCode;
  version: number;
  capabilities: readonly Capability[];
  quotas: PlanQuotas;
}

interface PlanDraft {
  reference: string;
  capabilities: readonly Capability[];
  quotas: Record<keyof PlanQuotas, string>;
}

interface PublishPlanVersionFormProps {
  action: (formData: FormData) => Promise<void>;
  latestPlans: readonly LatestPlanVersion[];
}

const emptyQuotas: PlanDraft['quotas'] = {
  maxSellerSeats: '',
  maxProducts: '',
  maxVariantsPerProduct: '',
  maxVariantsPerTenant: '',
};

export function getPlanDraft(planCode: PlanCode, latestPlans: readonly LatestPlanVersion[]): PlanDraft {
  const latestPlan = latestPlans.find((plan) => plan.planCode === planCode);

  if (!latestPlan) {
    return {
      reference: `${planLabels[planCode]} no tiene versiones publicadas`,
      capabilities: [],
      quotas: { ...emptyQuotas },
    };
  }

  return {
    reference: `Basado en ${planLabels[planCode]} v${latestPlan.version}`,
    capabilities: [...latestPlan.capabilities],
    quotas: {
      maxSellerSeats: String(latestPlan.quotas.maxSellerSeats),
      maxProducts: String(latestPlan.quotas.maxProducts),
      maxVariantsPerProduct: String(latestPlan.quotas.maxVariantsPerProduct),
      maxVariantsPerTenant: String(latestPlan.quotas.maxVariantsPerTenant),
    },
  };
}

export function PublishPlanVersionForm({ action, latestPlans }: PublishPlanVersionFormProps) {
  const [planCode, setPlanCode] = useState<PlanCode>('basic');
  const [draft, setDraft] = useState(() => getPlanDraft('basic', latestPlans));

  function selectPlan(value: string) {
    if (!isPlanCode(value)) return;

    setPlanCode(value);
    setDraft(getPlanDraft(value, latestPlans));
  }

  function updateQuota(quota: keyof PlanQuotas, value: string) {
    setDraft((current) => ({
      ...current,
      quotas: { ...current.quotas, [quota]: value },
    }));
  }

  function toggleCapability(capability: Capability, checked: boolean) {
    setDraft((current) => ({
      ...current,
      capabilities: checked
        ? [...current.capabilities, capability]
        : current.capabilities.filter((item) => item !== capability),
    }));
  }

  return (
    <form action={action} className="plan-management__card">
      <div className="plan-management__card-heading">
        <span>01</span>
        <div>
          <h3>Publicar versión</h3>
          <p>La versión se numera automáticamente y no podrá editarse.</p>
        </div>
      </div>

      <label>
        Plan
        <select name="planCode" required value={planCode} onChange={(event) => selectPlan(event.currentTarget.value)}>
          {Object.entries(planLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="plan-management__reference" role="status" aria-live="polite">
        {draft.reference}
      </div>

      <div className="plan-management__quotas">
        <label>
          Vendedores
          <input
            name="maxSellerSeats"
            type="number"
            min="0"
            required
            value={draft.quotas.maxSellerSeats}
            onChange={(event) => updateQuota('maxSellerSeats', event.currentTarget.value)}
          />
        </label>
        <label>
          Productos
          <input
            name="maxProducts"
            type="number"
            min="0"
            required
            value={draft.quotas.maxProducts}
            onChange={(event) => updateQuota('maxProducts', event.currentTarget.value)}
          />
        </label>
        <label>
          Variantes por producto
          <input
            name="maxVariantsPerProduct"
            type="number"
            min="0"
            required
            value={draft.quotas.maxVariantsPerProduct}
            onChange={(event) => updateQuota('maxVariantsPerProduct', event.currentTarget.value)}
          />
        </label>
        <label>
          Variantes totales
          <input
            name="maxVariantsPerTenant"
            type="number"
            min="0"
            required
            value={draft.quotas.maxVariantsPerTenant}
            onChange={(event) => updateQuota('maxVariantsPerTenant', event.currentTarget.value)}
          />
        </label>
      </div>

      <fieldset>
        <legend>Capacidades</legend>
        <div className="plan-management__capabilities">
          {CAPABILITIES.map((capability) => (
            <label key={capability}>
              <input
                name="capabilities"
                type="checkbox"
                value={capability}
                checked={draft.capabilities.includes(capability)}
                onChange={(event) => toggleCapability(capability, event.currentTarget.checked)}
              />
              <span>{capability}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit">Publicar nueva versión</button>
    </form>
  );
}

function isPlanCode(value: string): value is PlanCode {
  return value === 'basic' || value === 'medium' || value === 'professional';
}
