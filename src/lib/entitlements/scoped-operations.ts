export interface ClientMutationInput {
  name: string;
  cuit?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  zone?: number | null;
}

export interface ClientFormPolicy {
  canUseContactFields: boolean;
  canManageZones: boolean;
}

interface CapabilityNavigationItem {
  capability?: string;
}

const CLIENT_RESTRICTED_FIELDS = ['cuit', 'phone', 'email', 'address', 'provincia', 'localidad'] as const;

function toCapabilitySet(capabilities: readonly string[] | ReadonlySet<string>): ReadonlySet<string> {
  return new Set(capabilities);
}

function hasClientRestrictedField(input: ClientMutationInput): boolean {
  return CLIENT_RESTRICTED_FIELDS.some((field) => Boolean(input[field]?.trim()));
}

export function assertOperationAllowed(
  capabilities: readonly string[] | ReadonlySet<string>,
  requiredCapability: string,
): void {
  if (!toCapabilitySet(capabilities).has(requiredCapability)) {
    throw new Error('No autorizado');
  }
}

export function assertClientMutationAllowed(
  input: ClientMutationInput,
  capabilities: readonly string[] | ReadonlySet<string>,
): void {
  const capabilitySet = toCapabilitySet(capabilities);

  if (!capabilitySet.has('client.contact-fields') && hasClientRestrictedField(input)) {
    throw new Error('No autorizado');
  }

  if (!capabilitySet.has('zones.manage') && input.zone !== undefined && input.zone !== null) {
    throw new Error('No autorizado');
  }
}

export function getClientFormPolicy(capabilities: readonly string[] | ReadonlySet<string>): ClientFormPolicy {
  const capabilitySet = toCapabilitySet(capabilities);

  return {
    canUseContactFields: capabilitySet.has('client.contact-fields'),
    canManageZones: capabilitySet.has('zones.manage'),
  };
}

export function filterNavigationItems<T extends CapabilityNavigationItem>(
  items: readonly T[],
  capabilities: readonly string[] | ReadonlySet<string>,
): T[] {
  const capabilitySet = toCapabilitySet(capabilities);

  return items.filter((item) => !item.capability || capabilitySet.has(item.capability));
}

export function assertActivationUnavailable(): never {
  throw new Error('Tenant activation is unavailable until reconciliation and evidence are complete');
}
