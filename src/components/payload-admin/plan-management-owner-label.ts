import type { PlanVersion, User } from '@/payload-types';

const planLabels = {
  basic: 'Basic',
  medium: 'Medium',
  professional: 'Professional',
} as const;

const entitlementStateLabels: Record<NonNullable<User['entitlementState']>, string> = {
  provisioning: 'provisionando',
  active: 'activo',
  blocked: 'bloqueado',
};

interface OwnerOptionLabelInput {
  email: User['email'];
  businessName?: User['businessName'];
  name?: User['name'];
  activeEntitlementSnapshot?:
    | number
    | null
    | {
        planVersion?: number | null | Pick<PlanVersion, 'planCode' | 'version'>;
      };
  entitlementState?: User['entitlementState'];
}

export function getOwnerOptionLabel(owner: OwnerOptionLabelInput): string {
  const identity = owner.businessName || owner.name || owner.email;
  const plan = getOwnerPlanLabel(owner);
  const state = getEntitlementStateLabel(owner);

  return `${identity} · ${plan} · Estado: ${state}`;
}

function getOwnerPlanLabel(owner: OwnerOptionLabelInput): string {
  const snapshot = owner.activeEntitlementSnapshot;
  if (!snapshot || typeof snapshot === 'number') return 'Sin plan asignado';

  const planVersion = snapshot.planVersion;
  if (!planVersion || typeof planVersion === 'number') return 'Sin plan asignado';

  return `${planLabels[planVersion.planCode]} · v${planVersion.version}`;
}

function getEntitlementStateLabel(owner: OwnerOptionLabelInput): string {
  return owner.entitlementState ? entitlementStateLabels[owner.entitlementState] : 'sin estado';
}
