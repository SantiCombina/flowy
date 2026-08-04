import { cache } from 'react';

import { resolveId } from '@/lib/payload-utils';
import type { TenantEntitlementSnapshot, User } from '@/payload-types';

import {
  type Capability,
  CAPABILITIES,
  type EntitlementRole,
  getPlanCapabilities,
  resolveEffectiveCapabilities,
  roleCapabilities,
} from './capabilities';
import { planQuotasFromRow } from './quotas';
import type { EntitlementSnapshot, PlanVersionReference } from './snapshots';

export interface GuardedUser {
  user: User;
  capabilities: Set<Capability>;
  snapshot: EntitlementSnapshot | null;
  dbSnapshot: TenantEntitlementSnapshot | null;
  entitlementState: 'provisioning' | 'active' | 'blocked';
}

type EntitlementState = GuardedUser['entitlementState'];

export interface UserEntitlementContext {
  tenant: User;
  dbSnapshot: TenantEntitlementSnapshot | null;
  entitlementState: EntitlementState;
}

export interface EntitlementRecordReader {
  getUserById(id: number): Promise<User | null>;
  getSnapshotById(id: number): Promise<TenantEntitlementSnapshot | null>;
}

export function buildEntitlementSnapshot(dbSnapshot: TenantEntitlementSnapshot): EntitlementSnapshot | null {
  if (dbSnapshot.kind === 'plan') {
    const planVersion = typeof dbSnapshot.planVersion === 'number' ? null : dbSnapshot.planVersion;
    if (!planVersion) return null;

    const planVersionRef: PlanVersionReference = {
      planCode: planVersion.planCode,
      version: planVersion.version,
      capabilities: planVersion.capabilities?.map((entry) => entry.capability) ?? [],
      quotas: planQuotasFromRow(planVersion.quotas ?? {}),
    };

    return {
      id: String(dbSnapshot.id),
      kind: 'plan',
      planVersion: planVersionRef,
    };
  }

  const pool = dbSnapshot.pool?.map((entry) => entry.capability) ?? [];
  const userGrants: Record<string, readonly Capability[]> = {};

  for (const grant of dbSnapshot.userGrants ?? []) {
    const userId = resolveId(grant.user);
    if (userId === null) continue;

    userGrants[userId] = grant.capabilities?.map((entry) => entry.capability) ?? [];
  }

  return {
    id: String(dbSnapshot.id),
    kind: 'custom',
    pool,
    userGrants,
    quotas: planQuotasFromRow(dbSnapshot.quotas ?? {}),
  };
}

export function resolveDbSnapshotCapabilities(
  dbSnapshot: TenantEntitlementSnapshot,
  role: EntitlementRole,
  userId?: number,
): Set<Capability> {
  if (dbSnapshot.kind === 'plan') {
    const planVersion = typeof dbSnapshot.planVersion === 'number' ? null : dbSnapshot.planVersion;
    if (!planVersion) return new Set();

    const allowedCapabilities = getPlanCapabilities(planVersion.planCode, role);
    const snapshotCapabilities = new Set(
      (planVersion.capabilities?.map((entry) => entry.capability) ?? []).filter((capability) =>
        allowedCapabilities.has(capability),
      ),
    );
    return snapshotCapabilities;
  }

  const pool = dbSnapshot.pool?.map((entry) => entry.capability) ?? [];
  const grant = userId ? dbSnapshot.userGrants?.find((g) => resolveId(g.user) === userId) : undefined;
  const grantCapabilities = grant?.capabilities?.map((entry) => entry.capability) ?? [];

  return resolveEffectiveCapabilities({
    kind: 'custom',
    role,
    pool,
    grant: grantCapabilities,
  });
}

export function resolveUserRoleForCapabilities(user: User): EntitlementRole {
  if (user.role === 'admin') return 'owner';
  return user.role === 'owner' ? 'owner' : 'seller';
}

export function resolveUserCapabilities(
  user: User,
  dbSnapshot: TenantEntitlementSnapshot | null,
  entitlementState: EntitlementState = user.role === 'seller' ? 'active' : (user.entitlementState ?? 'provisioning'),
): Set<Capability> {
  if (user.role === 'admin') {
    return new Set(CAPABILITIES);
  }

  if (entitlementState === 'blocked') {
    return new Set();
  }

  const role = resolveUserRoleForCapabilities(user);

  if (!dbSnapshot) {
    return entitlementState === 'provisioning' ? new Set(roleCapabilities(role)) : new Set();
  }

  return resolveDbSnapshotCapabilities(dbSnapshot, role, user.id);
}

async function createEntitlementRecordReader(): Promise<EntitlementRecordReader> {
  const { getPayloadClient } = await import('@/lib/payload');
  const payload = await getPayloadClient();

  return {
    getUserById: async (id) =>
      payload.findByID({
        collection: 'users',
        id,
        depth: 0,
        overrideAccess: true,
      }),
    getSnapshotById: async (id) =>
      payload.findByID({
        collection: 'tenant-entitlement-snapshots',
        id,
        depth: 2,
        overrideAccess: true,
      }),
  };
}

export async function resolveUserEntitlementContext(
  user: User,
  reader?: EntitlementRecordReader,
): Promise<UserEntitlementContext> {
  if (user.role === 'admin') {
    return {
      tenant: user,
      dbSnapshot: null,
      entitlementState: user.entitlementState ?? 'provisioning',
    };
  }

  const entitlementReader = reader ?? (await createEntitlementRecordReader());
  let tenant = user;

  if (user.role === 'seller') {
    const ownerId = resolveId(user.owner);

    if (ownerId === null) {
      throw new Error('No se pudo resolver el owner del vendedor');
    }

    const owner = await entitlementReader.getUserById(ownerId);

    if (!owner || owner.role !== 'owner') {
      throw new Error('No se pudo resolver el owner canónico del vendedor');
    }

    tenant = owner;
  }

  const entitlementState = tenant.entitlementState ?? 'provisioning';

  if (entitlementState === 'blocked') {
    return { tenant, dbSnapshot: null, entitlementState };
  }

  const snapshotId =
    typeof tenant.activeEntitlementSnapshot === 'number'
      ? tenant.activeEntitlementSnapshot
      : (tenant.activeEntitlementSnapshot?.id ?? null);

  if (snapshotId === null) {
    return { tenant, dbSnapshot: null, entitlementState };
  }

  const dbSnapshot = await entitlementReader.getSnapshotById(snapshotId);

  if (!dbSnapshot) {
    throw new Error('No se pudo resolver el snapshot de capacidades');
  }

  if (resolveId(dbSnapshot.tenant) !== tenant.id) {
    throw new Error('El snapshot de capacidades no pertenece al tenant');
  }

  return { tenant, dbSnapshot, entitlementState };
}

export async function resolveTenantDbSnapshot(user: User): Promise<TenantEntitlementSnapshot | null> {
  return (await resolveUserEntitlementContext(user)).dbSnapshot;
}

export function buildGuardedUser(user: User, context: UserEntitlementContext): GuardedUser {
  const snapshot = context.dbSnapshot ? buildEntitlementSnapshot(context.dbSnapshot) : null;
  const capabilities = resolveUserCapabilities(user, context.dbSnapshot, context.entitlementState);

  return {
    user,
    capabilities,
    snapshot,
    dbSnapshot: context.dbSnapshot,
    entitlementState: context.entitlementState,
  };
}

async function getCurrentUserWithCapabilitiesUncached(): Promise<GuardedUser | null> {
  const { getCurrentUser } = await import('@/lib/payload');
  const currentUser = await getCurrentUser();

  if (!currentUser) return null;
  const context = await resolveUserEntitlementContext(currentUser);

  return buildGuardedUser(currentUser, context);
}

export const getCurrentUserWithCapabilities = cache(getCurrentUserWithCapabilitiesUncached);

export function hasCapability(
  user: User,
  dbSnapshot: TenantEntitlementSnapshot | null,
  capability: Capability,
  entitlementState?: EntitlementState,
): boolean {
  const capabilities = resolveUserCapabilities(user, dbSnapshot, entitlementState);
  return capabilities.has(capability);
}

export function assertCapability(
  user: User,
  dbSnapshot: TenantEntitlementSnapshot | null,
  capability: Capability,
): void {
  if (!hasCapability(user, dbSnapshot, capability)) {
    throw new Error('No autorizado');
  }
}

export function assertGuardedUserCapability(guardedUser: GuardedUser, capability: Capability): void {
  if (!guardedUser.capabilities.has(capability)) {
    throw new Error('No autorizado');
  }
}

export async function assertUserCapability(user: User, capability: Capability): Promise<void> {
  const context = await resolveUserEntitlementContext(user);
  const capabilities = resolveUserCapabilities(user, context.dbSnapshot, context.entitlementState);

  if (!capabilities.has(capability)) {
    throw new Error('No autorizado');
  }
}

export async function assertAnyUserCapability(user: User, capabilities: readonly Capability[]): Promise<void> {
  const context = await resolveUserEntitlementContext(user);
  const userCapabilities = resolveUserCapabilities(user, context.dbSnapshot, context.entitlementState);

  if (!capabilities.some((capability) => userCapabilities.has(capability))) {
    throw new Error('No autorizado');
  }
}

export function capabilitiesArray(capabilities: Set<Capability> | ReadonlySet<Capability>): Capability[] {
  return [...capabilities];
}
