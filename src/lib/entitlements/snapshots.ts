import {
  type Capability,
  type EntitlementRole,
  type PlanCode,
  getPlanCapabilities,
  resolveEffectiveCapabilities,
} from './capabilities';
import type { ResolvedQuotas } from './quotas';

interface SnapshotBase {
  id: string;
}

export interface PlanVersionReference {
  planCode: PlanCode;
  version: number;
  capabilities: readonly Capability[];
  quotas?: ResolvedQuotas;
}

export interface PlanEntitlementSnapshot extends SnapshotBase {
  kind: 'plan';
  planVersion: PlanVersionReference;
}

export interface CustomEntitlementSnapshot extends SnapshotBase {
  kind: 'custom';
  pool: readonly Capability[];
  userGrants: Readonly<Record<string, readonly Capability[]>>;
  quotas: ResolvedQuotas;
}

export type EntitlementSnapshot = PlanEntitlementSnapshot | CustomEntitlementSnapshot;

export function resolveSnapshotCapabilities(
  snapshot: EntitlementSnapshot,
  role: EntitlementRole,
  userId?: string,
): Set<Capability> {
  if (snapshot.kind === 'plan') {
    const allowedCapabilities = getPlanCapabilities(snapshot.planVersion.planCode, role);
    return new Set(snapshot.planVersion.capabilities.filter((capability) => allowedCapabilities.has(capability)));
  }

  return resolveEffectiveCapabilities({
    kind: 'custom',
    role,
    pool: snapshot.pool,
    grant: userId ? (snapshot.userGrants[userId] ?? []) : [],
  });
}
