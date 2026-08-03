'use server';

import { CAPABILITIES } from '@/lib/entitlements/capabilities';
import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import { planCapabilities, planQuotasFromRow } from '@/lib/entitlements/quotas';
import type { PlanVersion, TenantEntitlementSnapshot, User } from '@/payload-types';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export interface EntitlementDependencies {
  transactionID: string | number;
  now: string;
  lock: LockDependencies;
  lockContext: LockContext;
  findUserById(args: unknown): Promise<User>;
  updateUser(args: unknown): Promise<User>;
  findPlanVersionById(args: unknown): Promise<PlanVersion>;
  createSnapshot(args: unknown): Promise<TenantEntitlementSnapshot>;
  findSnapshots(args: unknown): Promise<{ docs: TenantEntitlementSnapshot[] }>;
  emitMutation(args: {
    collection: 'entitlement-outbox';
    data: Record<string, unknown>;
    overrideAccess: true;
    context: { entitlementMutation: true };
    req: { transactionID: string | number };
  }): Promise<unknown>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface AssignPlanResult {
  snapshot: TenantEntitlementSnapshot;
  previousState: 'provisioning' | 'active' | 'blocked' | null;
}

export interface ChangePlanResult {
  snapshot: TenantEntitlementSnapshot;
  previousSnapshotId: number;
}

export type UpgradePlanResult = ChangePlanResult;

export async function assignPlanToTenant(
  tenantId: number,
  planVersionId: number,
  createdBy: number,
  dependencies?: EntitlementDependencies,
): Promise<AssignPlanResult> {
  if (dependencies) {
    return runAssignPlanToTenant(tenantId, planVersionId, createdBy, dependencies);
  }

  const deps = await defaultEntitlementDependencies(tenantId);
  try {
    const result = await runAssignPlanToTenant(tenantId, planVersionId, createdBy, deps);
    await deps.commit();
    return result;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

export async function changeTenantPlan(
  tenantId: number,
  planVersionId: number,
  createdBy: number,
  dependencies?: EntitlementDependencies,
): Promise<ChangePlanResult> {
  if (dependencies) {
    return runChangeTenantPlan(tenantId, planVersionId, createdBy, dependencies);
  }

  const deps = await defaultEntitlementDependencies(tenantId);
  try {
    const result = await runChangeTenantPlan(tenantId, planVersionId, createdBy, deps);
    await deps.commit();
    return result;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

export async function upgradeTenantPlan(
  tenantId: number,
  planVersionId: number,
  createdBy: number,
  dependencies?: EntitlementDependencies,
): Promise<UpgradePlanResult> {
  return changeTenantPlan(tenantId, planVersionId, createdBy, dependencies);
}

export async function assignOrChangeTenantPlan(
  tenantId: number,
  planVersionId: number,
  createdBy: number,
): Promise<AssignPlanResult | ChangePlanResult> {
  const payload = await getPayloadClient();

  const tenant = await payload.findByID({
    collection: 'users',
    id: tenantId,
    depth: 1,
    overrideAccess: true,
  });

  const snapshotId = resolveUserSnapshotId(tenant.activeEntitlementSnapshot);
  if (snapshotId === null) {
    return assignPlanToTenant(tenantId, planVersionId, createdBy);
  }
  return changeTenantPlan(tenantId, planVersionId, createdBy);
}

export async function publishPlanVersion(
  planCode: 'basic' | 'medium' | 'professional',
  capabilities: readonly { capability: (typeof CAPABILITIES)[number] }[],
  quotas: {
    maxSellerSeats: number;
    maxProducts: number;
    maxVariantsPerProduct: number;
    maxVariantsPerTenant: number;
  },
  createdBy: number,
): Promise<void> {
  const payload = await getPayloadClient();

  planCapabilities(planCode);

  const latest = await payload.find({
    collection: 'plan-versions',
    where: { planCode: { equals: planCode } },
    sort: '-version',
    limit: 1,
    overrideAccess: true,
  });

  const nextVersion = (latest.docs[0]?.version ?? 0) + 1;

  await payload.create({
    collection: 'plan-versions',
    data: {
      planCode,
      version: nextVersion,
      capabilities: [...capabilities],
      quotas,
      publishedAt: new Date().toISOString(),
      createdBy,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
  });
}

export { transitionTenantState as _transitionTenantState };

async function transitionTenantState(
  tenantId: number,
  expectedState: 'provisioning' | 'active' | 'blocked',
  nextState: 'provisioning' | 'active' | 'blocked',
  dependencies?: EntitlementDependencies,
): Promise<void> {
  if (dependencies) {
    return runTransitionTenantState(tenantId, expectedState, nextState, dependencies);
  }

  const deps = await defaultEntitlementDependencies(tenantId);
  try {
    await runTransitionTenantState(tenantId, expectedState, nextState, deps);
    await deps.commit();
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

async function runAssignPlanToTenant(
  tenantId: number,
  planVersionId: number,
  createdBy: number,
  dependencies: EntitlementDependencies,
): Promise<AssignPlanResult> {
  const mutationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const user = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  const currentState = user.entitlementState ?? 'provisioning';
  const previousSnapshotId = resolveUserSnapshotId(user.activeEntitlementSnapshot);

  if (previousSnapshotId !== null) {
    throw new Error('Tenant already has an assigned entitlement snapshot');
  }

  if (currentState !== 'provisioning') {
    throw new Error('Tenant must be in provisioning state for initial assignment');
  }

  const idempotencyKey = generateSnapshotIdempotencyKey(tenantId, planVersionId, 1);
  const existing = await findSnapshotByIdempotencyKey(dependencies, idempotencyKey);
  if (existing) {
    return { snapshot: existing, previousState: currentState };
  }

  const planVersion = await dependencies.findPlanVersionById({
    collection: 'plan-versions',
    id: planVersionId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  planQuotasFromRow(planVersion.quotas);
  planCapabilities(planVersion.planCode);

  const snapshot = await dependencies.createSnapshot({
    collection: 'tenant-entitlement-snapshots',
    data: {
      tenant: tenantId,
      sequence: 1,
      idempotencyKey,
      kind: 'plan',
      planVersion: planVersionId,
      createdBy,
    },
    overrideAccess: true,
    context: { entitlementMutation: true, entitlementNow: dependencies.now },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.updateUser({
    collection: 'users',
    id: tenantId,
    data: {
      activeEntitlementSnapshot: snapshot.id,
      entitlementState: 'provisioning',
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.emitMutation({
    collection: 'entitlement-outbox',
    data: {
      idempotencyKey: `mutation:${tenantId}:${mutationNonce}`,
      kind: 'entitlement.mutation',
      aggregate: `tenant:${tenantId}`,
      payload: { tenantId, nonce: mutationNonce },
      state: 'sent',
      attempts: 0,
      availableAt: dependencies.now,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  return { snapshot, previousState: currentState };
}

async function runChangeTenantPlan(
  tenantId: number,
  planVersionId: number,
  createdBy: number,
  dependencies: EntitlementDependencies,
): Promise<ChangePlanResult> {
  const mutationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const user = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  const previousSnapshotId = resolveUserSnapshotId(user.activeEntitlementSnapshot);
  if (previousSnapshotId === null) {
    throw new Error('Tenant has no active entitlement snapshot to change');
  }

  const previousSnapshot = await dependencies
    .findSnapshots({
      collection: 'tenant-entitlement-snapshots',
      where: {
        and: [{ tenant: { equals: tenantId } }, { id: { equals: previousSnapshotId } }],
      },
      limit: 1,
      overrideAccess: true,
      req: { transactionID: dependencies.transactionID },
    })
    .then((result) => result.docs[0]);

  if (!previousSnapshot) {
    throw new Error('Active entitlement snapshot not found');
  }

  const previousPlanVersionId =
    typeof previousSnapshot.planVersion === 'number'
      ? previousSnapshot.planVersion
      : (previousSnapshot.planVersion?.id ?? null);

  if (previousPlanVersionId === null) {
    throw new Error('Previous snapshot is not a plan snapshot');
  }

  if (previousPlanVersionId === planVersionId) {
    throw new Error('Cannot change to the same plan version');
  }

  const planVersion = await dependencies.findPlanVersionById({
    collection: 'plan-versions',
    id: planVersionId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  planQuotasFromRow(planVersion.quotas);
  planCapabilities(planVersion.planCode);

  const nextSequence = previousSnapshot.sequence + 1;
  const idempotencyKey = generateSnapshotIdempotencyKey(tenantId, planVersionId, nextSequence);
  const existing = await findSnapshotByIdempotencyKey(dependencies, idempotencyKey);
  if (existing) {
    return { snapshot: existing, previousSnapshotId };
  }

  const snapshot = await dependencies.createSnapshot({
    collection: 'tenant-entitlement-snapshots',
    data: {
      tenant: tenantId,
      sequence: nextSequence,
      idempotencyKey,
      kind: 'plan',
      planVersion: planVersionId,
      predecessor: previousSnapshotId,
      createdBy,
    },
    overrideAccess: true,
    context: { entitlementMutation: true, entitlementNow: dependencies.now },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.updateUser({
    collection: 'users',
    id: tenantId,
    data: {
      activeEntitlementSnapshot: snapshot.id,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.emitMutation({
    collection: 'entitlement-outbox',
    data: {
      idempotencyKey: `mutation:${tenantId}:${mutationNonce}`,
      kind: 'entitlement.mutation',
      aggregate: `tenant:${tenantId}`,
      payload: { tenantId, nonce: mutationNonce },
      state: 'sent',
      attempts: 0,
      availableAt: dependencies.now,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  return { snapshot, previousSnapshotId };
}

async function runTransitionTenantState(
  tenantId: number,
  expectedState: 'provisioning' | 'active' | 'blocked',
  nextState: 'provisioning' | 'active' | 'blocked',
  dependencies: EntitlementDependencies,
): Promise<void> {
  const mutationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const user = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  if (user.role !== 'owner') {
    throw new Error('Entitlement tenant must be an owner');
  }

  const currentState = user.entitlementState ?? 'provisioning';
  if (currentState !== expectedState) {
    throw new Error(`Expected state ${expectedState} but found ${currentState}`);
  }

  await dependencies.updateUser({
    collection: 'users',
    id: tenantId,
    data: { entitlementState: nextState },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.emitMutation({
    collection: 'entitlement-outbox',
    data: {
      idempotencyKey: `mutation:${tenantId}:${mutationNonce}`,
      kind: 'entitlement.mutation',
      aggregate: `tenant:${tenantId}`,
      payload: { tenantId, nonce: mutationNonce },
      state: 'sent',
      attempts: 0,
      availableAt: dependencies.now,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });
}

export async function defaultEntitlementDependencies(tenantId: number): Promise<EntitlementDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  return {
    transactionID,
    now: new Date().toISOString(),
    lock,
    lockContext: { transactionID, tenantId },
    findUserById: async (args) => payload.findByID(args as never) as unknown as Promise<User>,
    updateUser: async (args) => payload.update(args as never) as unknown as Promise<User>,
    findPlanVersionById: async (args) => payload.findByID(args as never) as unknown as Promise<PlanVersion>,
    createSnapshot: async (args) => payload.create(args as never) as unknown as Promise<TenantEntitlementSnapshot>,
    findSnapshots: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: TenantEntitlementSnapshot[] }>,
    emitMutation: async (args) => payload.create(args as never) as unknown,
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}

function resolveUserSnapshotId(value: number | User | TenantEntitlementSnapshot | null | undefined): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') return value.id;
  return null;
}

function generateSnapshotIdempotencyKey(tenantId: number, planVersionId: number, sequence: number): string {
  return `snapshot:${tenantId}:${planVersionId}:${sequence}`;
}

async function findSnapshotByIdempotencyKey(
  dependencies: EntitlementDependencies,
  idempotencyKey: string,
): Promise<TenantEntitlementSnapshot | null> {
  const result = await dependencies.findSnapshots({
    collection: 'tenant-entitlement-snapshots',
    where: {
      and: [{ tenant: { equals: dependencies.lockContext.tenantId } }, { idempotencyKey: { equals: idempotencyKey } }],
    },
    limit: 1,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  return result.docs[0] ?? null;
}
