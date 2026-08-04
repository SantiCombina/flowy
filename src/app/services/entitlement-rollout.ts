'use server';

import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import {
  countProducts,
  countSeats,
  countVariants,
  countVariantsByProduct,
  snapshotQuotas,
  type CountDependencies,
} from '@/lib/entitlements/quotas';
import type { EntitlementOutbox, TenantEntitlementSnapshot, User } from '@/payload-types';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

export const RECONCILIATION_BATCH_LIMIT = 1_000;

export const RECONCILIATION_SOURCES = [
  'users',
  'invitations',
  'products',
  'product-variants',
  'clients',
  'budgets',
  'sales',
] as const;

export type ReconciliationSource = (typeof RECONCILIATION_SOURCES)[number];

interface RolloutRecord {
  id: number;
  idempotencyKey: string;
  payload: unknown;
  state: string;
  lastError?: string | null;
}

interface TenantOwnerRecord {
  id: number;
  role?: string | null;
  entitlementState?: string | null;
  activeEntitlementSnapshot?: number | { id: number } | null;
}

export interface EntitlementEvidencePayload {
  version: 1;
  evidenceId: string;
  tenantId: number;
  runId: string;
  status: 'passed' | 'failed';
  unit: { status: 'passed' | 'failed'; commands: string[] };
  isolatedPostgres: { status: 'passed' | 'failed'; database: 'isolated' };
  recordedAt: string;
}

export interface EvidenceDependencies {
  now(): string;
  findEvidence(idempotencyKey: string): Promise<RolloutRecord | null>;
  createEvidence(record: Omit<RolloutRecord, 'id'>): Promise<RolloutRecord>;
}

interface ReconciliationCursor {
  source: ReconciliationSource | null;
  sourceIndex: number;
  lastProcessedId: number;
}

export interface ReconciliationCheckpoint {
  version: 1;
  runId: string;
  tenantId: number;
  status: 'running' | 'completed' | 'failed';
  highWaterIds: Record<ReconciliationSource, number>;
  cursor: ReconciliationCursor;
  processedRecords: number;
  expectedSnapshotId: number;
  startedAt: string;
  updatedAt: string;
  startNonce: number;
  completedNonce: number | null;
  error: string | null;
}

export interface ReconciliationBatchResult {
  status: ReconciliationCheckpoint['status'];
  processedRecords: number;
  cursor: Pick<ReconciliationCursor, 'source' | 'lastProcessedId'>;
  highWaterIds: Record<ReconciliationSource, number>;
}

export interface ReconciliationDependencies {
  transactionID: string | number;
  now(): string;
  lock: LockDependencies;
  lockContext: LockContext;
  findCheckpoint(idempotencyKey: string): Promise<RolloutRecord | null>;
  createCheckpoint(record: Omit<RolloutRecord, 'id'>): Promise<RolloutRecord>;
  updateCheckpoint(id: number, record: Omit<RolloutRecord, 'id'>): Promise<RolloutRecord>;
  findTenantOwner(tenantId: number): Promise<TenantOwnerRecord>;
  findHighWaterId(source: ReconciliationSource, tenantId: number): Promise<number>;
  findSourceRecords(args: {
    source: ReconciliationSource;
    tenantId: number;
    afterId: number;
    highWaterId: number;
    limit: number;
  }): Promise<Array<{ id: number }>>;
  validateSourceRecord(source: ReconciliationSource, record: { id: number }, tenantId: number): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface ActivationDependencies {
  transactionID: string | number;
  now(): string;
  lock: LockDependencies;
  lockContext: LockContext;
  findTenantOwner(tenantId: number): Promise<TenantOwnerRecord>;
  findCheckpoint(idempotencyKey: string): Promise<RolloutRecord | null>;
  findEvidence(idempotencyKey: string): Promise<RolloutRecord | null>;
  findTailEvents(args: {
    tenantId: number;
    afterId: number;
    afterNonce: number;
    throughNonce: number;
    limit: number;
  }): Promise<RolloutRecord[]>;
  validateTenantEntitlements(args: {
    tenantId: number;
    snapshotId: number;
    transactionID: string | number;
  }): Promise<void>;
  compareAndSetTenantActivation(args: {
    tenantId: number;
    expectedState: 'provisioning';
    expectedSnapshotId: number;
    nextState: 'active';
    transactionID: string | number;
  }): Promise<boolean>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface ActivationResult {
  tenantId: number;
  snapshotId: number;
  state: 'active';
  reconciledThroughNonce: number;
}

export async function reconcileTenantEntitlements(
  input: { tenantId: number; runId: string; requestedBatchSize?: number },
  dependencies?: ReconciliationDependencies,
): Promise<ReconciliationBatchResult> {
  if (dependencies) return runTenantReconciliationBatch(input, dependencies);

  const resolved = await defaultReconciliationDependencies(input.tenantId);
  try {
    const result = await runTenantReconciliationBatch(input, resolved);
    await resolved.commit();
    return result;
  } catch (error) {
    await resolved.rollback();
    throw error;
  }
}

export async function recordEntitlementEvidence(
  input: {
    tenantId: number;
    runId: string;
    evidenceId: string;
    unit: EntitlementEvidencePayload['unit'];
    isolatedPostgres: EntitlementEvidencePayload['isolatedPostgres'];
  },
  dependencies?: EvidenceDependencies,
): Promise<EntitlementEvidencePayload> {
  const resolved = dependencies ?? (await defaultEvidenceDependencies());
  if (input.unit.commands.length === 0) {
    throw new Error('Deterministic unit evidence must include executed commands');
  }

  const key = entitlementEvidenceKey(input.evidenceId, input.tenantId);
  const existing = await resolved.findEvidence(key);
  if (existing) {
    const evidence = parseEvidence(existing.payload, input);
    if (!evidence) {
      throw new Error('Existing entitlement evidence conflicts with the requested identity');
    }
    if (
      evidence.unit.status !== input.unit.status ||
      evidence.isolatedPostgres.status !== input.isolatedPostgres.status ||
      JSON.stringify(evidence.unit.commands) !== JSON.stringify(input.unit.commands)
    ) {
      throw new Error('Existing entitlement evidence conflicts with the requested results');
    }
    return evidence;
  }

  const status = input.unit.status === 'passed' && input.isolatedPostgres.status === 'passed' ? 'passed' : 'failed';
  const evidence: EntitlementEvidencePayload = {
    version: 1,
    evidenceId: input.evidenceId,
    tenantId: input.tenantId,
    runId: input.runId,
    status,
    unit: input.unit,
    isolatedPostgres: input.isolatedPostgres,
    recordedAt: resolved.now(),
  };
  await resolved.createEvidence({
    idempotencyKey: key,
    payload: evidence,
    state: status === 'passed' ? 'sent' : 'failed',
    lastError: status === 'passed' ? null : 'Entitlement verification evidence failed',
  });
  return evidence;
}

export async function runTenantReconciliationBatch(
  input: { tenantId: number; runId: string; requestedBatchSize?: number },
  dependencies: ReconciliationDependencies,
): Promise<ReconciliationBatchResult> {
  const batchSize = Math.min(
    Math.max(input.requestedBatchSize ?? RECONCILIATION_BATCH_LIMIT, 1),
    RECONCILIATION_BATCH_LIMIT,
  );
  const checkpointKey = reconciliationCheckpointKey(input.runId, input.tenantId);
  const lockNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);
  const owner = await dependencies.findTenantOwner(input.tenantId);

  if (owner.role !== 'owner' || owner.id !== input.tenantId) {
    throw new Error('Reconciliation tenant must be its canonical owner');
  }
  if ((owner.entitlementState ?? 'provisioning') !== 'provisioning') {
    throw new Error('Reconciliation requires a provisioning tenant');
  }

  const expectedSnapshotId = relationshipId(owner.activeEntitlementSnapshot);
  if (expectedSnapshotId === null) {
    throw new Error('Reconciliation requires an assigned entitlement snapshot');
  }

  let stored = await dependencies.findCheckpoint(checkpointKey);
  let checkpoint = stored
    ? parseCheckpoint(stored.payload, input)
    : await createInitialCheckpoint(input, expectedSnapshotId, lockNonce, dependencies);

  if (!stored) {
    stored = await dependencies.createCheckpoint(toRolloutRecord(checkpoint));
  }

  if (checkpoint.expectedSnapshotId !== expectedSnapshotId) {
    throw new Error('Reconciliation snapshot pointer changed');
  }
  if (checkpoint.status === 'completed') {
    return batchResult(checkpoint);
  }

  try {
    checkpoint = await processBatch(checkpoint, batchSize, lockNonce, dependencies);
    await dependencies.updateCheckpoint(stored.id, toRolloutRecord(checkpoint));
    return batchResult(checkpoint);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown reconciliation failure';
    const failed = { ...checkpoint, status: 'failed' as const, updatedAt: dependencies.now(), error: message };
    await dependencies.updateCheckpoint(stored.id, toRolloutRecord(failed));
    throw error;
  }
}

export async function activateTenantEntitlements(
  input: { tenantId: number; runId: string; evidenceId: string },
  dependencies?: ActivationDependencies,
): Promise<ActivationResult> {
  if (dependencies) return runTenantActivation(input, dependencies);

  const resolved = await defaultActivationDependencies(input.tenantId);
  try {
    const result = await runTenantActivation(input, resolved);
    await resolved.commit();
    return result;
  } catch (error) {
    await resolved.rollback();
    throw error;
  }
}

async function runTenantActivation(
  input: { tenantId: number; runId: string; evidenceId: string },
  dependencies: ActivationDependencies,
): Promise<ActivationResult> {
  const activationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);
  const owner = await dependencies.findTenantOwner(input.tenantId);

  if (owner.role !== 'owner' || owner.id !== input.tenantId) {
    throw new Error('Activation tenant must be its canonical owner');
  }
  if ((owner.entitlementState ?? 'provisioning') !== 'provisioning') {
    throw new Error('Activation requires a provisioning tenant');
  }

  const snapshotId = relationshipId(owner.activeEntitlementSnapshot);
  if (snapshotId === null) {
    throw new Error('Activation requires an assigned entitlement snapshot');
  }

  const checkpointRecord = await dependencies.findCheckpoint(reconciliationCheckpointKey(input.runId, input.tenantId));
  if (!checkpointRecord) {
    throw new Error('Completed reconciliation checkpoint is required for activation');
  }

  const checkpoint = parseCheckpoint(checkpointRecord.payload, input);
  if (
    checkpoint.status !== 'completed' ||
    checkpoint.completedNonce === null ||
    checkpoint.expectedSnapshotId !== snapshotId
  ) {
    throw new Error('Completed reconciliation checkpoint does not match the tenant snapshot');
  }

  const evidenceRecord = await dependencies.findEvidence(entitlementEvidenceKey(input.evidenceId, input.tenantId));
  const evidence = evidenceRecord ? parseEvidence(evidenceRecord.payload, input) : null;
  if (
    !evidenceRecord ||
    evidenceRecord.state !== 'sent' ||
    !evidence ||
    evidence.status !== 'passed' ||
    evidence.unit.status !== 'passed' ||
    evidence.isolatedPostgres.status !== 'passed'
  ) {
    throw new Error('Passing deterministic unit and isolated PostgreSQL evidence is required for activation');
  }

  const latestCommittedNonce = activationNonce - 1;
  await reconcileActivationTail(input.tenantId, checkpoint.completedNonce, latestCommittedNonce, dependencies);

  await dependencies.validateTenantEntitlements({
    tenantId: input.tenantId,
    snapshotId,
    transactionID: dependencies.transactionID,
  });

  const activated = await dependencies.compareAndSetTenantActivation({
    tenantId: input.tenantId,
    expectedState: 'provisioning',
    expectedSnapshotId: snapshotId,
    nextState: 'active',
    transactionID: dependencies.transactionID,
  });
  if (!activated) {
    throw new Error('Tenant activation state or snapshot changed');
  }

  return {
    tenantId: input.tenantId,
    snapshotId,
    state: 'active',
    reconciledThroughNonce: latestCommittedNonce,
  };
}

async function reconcileActivationTail(
  tenantId: number,
  completedNonce: number,
  latestCommittedNonce: number,
  dependencies: ActivationDependencies,
): Promise<void> {
  let expectedNonce = completedNonce + 1;
  let afterId = 0;

  while (expectedNonce <= latestCommittedNonce) {
    const events = await dependencies.findTailEvents({
      tenantId,
      afterId,
      afterNonce: expectedNonce - 1,
      throughNonce: latestCommittedNonce,
      limit: RECONCILIATION_BATCH_LIMIT,
    });
    if (events.length === 0) {
      throw new Error(`Activation tail has a nonce gap at ${expectedNonce}`);
    }

    for (const event of events) {
      const nonce = eventNonce(event.payload, tenantId);
      if (nonce !== expectedNonce) {
        throw new Error(`Activation tail has a nonce gap at ${expectedNonce}`);
      }
      expectedNonce += 1;
      afterId = event.id;
    }
  }
}

async function defaultReconciliationDependencies(tenantId: number): Promise<ReconciliationDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) throw new Error('No se pudo iniciar la transacciÃ³n de reconciliaciÃ³n');
  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');

  return {
    transactionID,
    now: () => new Date().toISOString(),
    lock: await defaultLockDependencies(),
    lockContext: { transactionID, tenantId },
    findCheckpoint: async (key) => findRolloutRecord(payload, key),
    createCheckpoint: async (record) =>
      createRolloutRecord(payload, record, 'entitlement.reconciliation', `tenant:${tenantId}`),
    updateCheckpoint: async (id, record) => updateRolloutRecord(payload, id, record),
    findTenantOwner: async (id) =>
      payload.findByID({
        collection: 'users',
        id,
        overrideAccess: true,
        req: { transactionID },
      }) as unknown as Promise<User>,
    findHighWaterId: async (source, id) => {
      const result = (await payload.find({
        collection: source,
        where: sourceTenantWhere(source, id),
        sort: '-id',
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req: { transactionID },
      } as never)) as unknown as { docs: Array<{ id: number }> };
      return result.docs[0]?.id ?? 0;
    },
    findSourceRecords: async ({ source, tenantId: id, afterId, highWaterId, limit }) => {
      const result = (await payload.find({
        collection: source,
        where: {
          and: [
            sourceTenantWhere(source, id),
            { id: { greater_than: afterId } },
            { id: { less_than_equal: highWaterId } },
          ],
        },
        sort: 'id',
        limit,
        depth: 0,
        overrideAccess: true,
        req: { transactionID },
      } as never)) as unknown as { docs: Array<{ id: number }> };
      return result.docs;
    },
    validateSourceRecord: async (_source, record) => {
      if (!Number.isSafeInteger(record.id) || record.id <= 0) {
        throw new Error('Reconciliation encountered an invalid record identifier');
      }
    },
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}

async function defaultEvidenceDependencies(): Promise<EvidenceDependencies> {
  const payload = await getPayloadClient();
  return {
    now: () => new Date().toISOString(),
    findEvidence: async (key) => findRolloutRecord(payload, key),
    createEvidence: async (record) =>
      createRolloutRecord(payload, record, 'entitlement.evidence', `tenant:${evidenceTenantId(record.payload)}`),
  };
}

async function defaultActivationDependencies(tenantId: number): Promise<ActivationDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) throw new Error('No se pudo iniciar la transacciÃ³n de activaciÃ³n');
  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');

  return {
    transactionID,
    now: () => new Date().toISOString(),
    lock: await defaultLockDependencies(),
    lockContext: { transactionID, tenantId },
    findTenantOwner: async (id) =>
      payload.findByID({
        collection: 'users',
        id,
        overrideAccess: true,
        req: { transactionID },
      }) as unknown as Promise<User>,
    findCheckpoint: async (key) => findRolloutRecord(payload, key, transactionID),
    findEvidence: async (key) => findRolloutRecord(payload, key, transactionID),
    findTailEvents: async ({ tenantId: id, afterId, limit }) => {
      const result = (await payload.find({
        collection: 'entitlement-outbox',
        where: {
          and: [
            { kind: { equals: 'entitlement.mutation' } },
            { aggregate: { equals: `tenant:${id}` } },
            { id: { greater_than: afterId } },
          ],
        },
        sort: 'id',
        limit,
        depth: 0,
        overrideAccess: true,
        req: { transactionID },
      })) as unknown as { docs: EntitlementOutbox[] };
      return result.docs.map(toStoredRolloutRecord);
    },
    validateTenantEntitlements: async ({ tenantId: id, snapshotId }) => {
      await validateTenantSnapshotAndQuotas(payload, transactionID, id, snapshotId);
    },
    compareAndSetTenantActivation: async ({ tenantId: id, expectedState, expectedSnapshotId, nextState }) => {
      const result = (await payload.update({
        collection: 'users',
        where: {
          and: [
            { id: { equals: id } },
            { entitlementState: { equals: expectedState } },
            { activeEntitlementSnapshot: { equals: expectedSnapshotId } },
          ],
        },
        data: { entitlementState: nextState },
        limit: 1,
        overrideAccess: true,
        context: { entitlementMutation: true },
        req: { transactionID },
      })) as unknown as { docs: User[] };
      return result.docs.length === 1;
    },
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}

async function findRolloutRecord(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  idempotencyKey: string,
  transactionID?: string | number,
): Promise<RolloutRecord | null> {
  const result = (await payload.find({
    collection: 'entitlement-outbox',
    where: { idempotencyKey: { equals: idempotencyKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    ...(transactionID === undefined ? {} : { req: { transactionID } }),
  })) as unknown as { docs: EntitlementOutbox[] };
  return result.docs[0] ? toStoredRolloutRecord(result.docs[0]) : null;
}

async function createRolloutRecord(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  record: Omit<RolloutRecord, 'id'>,
  kind: string,
  aggregate: string,
): Promise<RolloutRecord> {
  const created = (await payload.create({
    collection: 'entitlement-outbox',
    data: {
      ...record,
      kind,
      aggregate,
      attempts: 0,
      availableAt: new Date().toISOString(),
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
  } as never)) as unknown as EntitlementOutbox;
  return toStoredRolloutRecord(created);
}

async function updateRolloutRecord(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  id: number,
  record: Omit<RolloutRecord, 'id'>,
): Promise<RolloutRecord> {
  const updated = (await payload.update({
    collection: 'entitlement-outbox',
    id,
    data: record,
    overrideAccess: true,
    context: { entitlementMutation: true },
  } as never)) as unknown as EntitlementOutbox;
  return toStoredRolloutRecord(updated);
}

function toStoredRolloutRecord(record: EntitlementOutbox): RolloutRecord {
  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey,
    payload: record.payload,
    state: record.state,
    lastError: record.lastError,
  };
}

function sourceTenantWhere(source: ReconciliationSource, tenantId: number): object {
  if (source === 'users') {
    return { or: [{ id: { equals: tenantId } }, { owner: { equals: tenantId } }] };
  }
  if (source === 'invitations') {
    return { createdBy: { equals: tenantId } };
  }
  return { owner: { equals: tenantId } };
}

export { validateTenantSnapshotAndQuotas as _validateTenantSnapshotAndQuotas };

async function validateTenantSnapshotAndQuotas(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  transactionID: string | number,
  tenantId: number,
  snapshotId: number,
): Promise<void> {
  const snapshot = (await payload.findByID({
    collection: 'tenant-entitlement-snapshots',
    id: snapshotId,
    depth: 1,
    overrideAccess: true,
    req: { transactionID },
  })) as unknown as TenantEntitlementSnapshot;
  if (relationshipId(snapshot.tenant) !== tenantId) {
    throw new Error('Active entitlement snapshot belongs to another tenant');
  }

  const quotas = snapshotQuotas(snapshot);
  const countDependencies: CountDependencies = {
    findUsers: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: unknown[]; totalDocs: number }>,
    findInvitations: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: unknown[]; totalDocs: number }>,
    findProducts: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: unknown[]; totalDocs: number }>,
    findVariants: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: unknown[]; totalDocs: number }>,
  };
  const countContext = { transactionID, tenantId, now: new Date().toISOString() };
  const [seats, products, variants] = await Promise.all([
    countSeats(countDependencies, countContext),
    countProducts(countDependencies, countContext),
    countVariants(countDependencies, countContext),
  ]);

  if (seats > quotas.maxSellerSeats) throw new Error('Tenant exceeds the seller seat quota');
  if (products > quotas.maxProducts) throw new Error('Tenant exceeds the product quota');
  if (variants > quotas.maxVariantsPerTenant) throw new Error('Tenant exceeds the variant quota');

  let afterId = 0;
  while (true) {
    const result = (await payload.find({
      collection: 'products',
      where: {
        and: [{ owner: { equals: tenantId } }, { id: { greater_than: afterId } }],
      },
      sort: 'id',
      limit: RECONCILIATION_BATCH_LIMIT,
      depth: 0,
      overrideAccess: true,
      req: { transactionID },
    })) as unknown as { docs: Array<{ id: number }> };
    for (const product of result.docs) {
      const productVariants = await countVariantsByProduct(countDependencies, { transactionID }, product.id);
      if (productVariants > quotas.maxVariantsPerProduct) {
        throw new Error(`Product ${product.id} exceeds the variant quota`);
      }
    }
    if (result.docs.length < RECONCILIATION_BATCH_LIMIT) break;
    afterId = result.docs.at(-1)?.id ?? afterId;
  }
}

function evidenceTenantId(payload: unknown): number {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('tenantId' in payload) ||
    typeof payload.tenantId !== 'number'
  ) {
    throw new Error('Evidence tenant is required');
  }
  return payload.tenantId;
}

async function createInitialCheckpoint(
  input: { tenantId: number; runId: string },
  expectedSnapshotId: number,
  lockNonce: number,
  dependencies: ReconciliationDependencies,
): Promise<ReconciliationCheckpoint> {
  const highWaterEntries = await Promise.all(
    RECONCILIATION_SOURCES.map(
      async (source) => [source, await dependencies.findHighWaterId(source, input.tenantId)] as const,
    ),
  );
  const timestamp = dependencies.now();

  return {
    version: 1,
    runId: input.runId,
    tenantId: input.tenantId,
    status: 'running',
    highWaterIds: Object.fromEntries(highWaterEntries) as Record<ReconciliationSource, number>,
    cursor: { source: RECONCILIATION_SOURCES[0], sourceIndex: 0, lastProcessedId: 0 },
    processedRecords: 0,
    expectedSnapshotId,
    startedAt: timestamp,
    updatedAt: timestamp,
    startNonce: lockNonce,
    completedNonce: null,
    error: null,
  };
}

async function processBatch(
  checkpoint: ReconciliationCheckpoint,
  batchSize: number,
  lockNonce: number,
  dependencies: ReconciliationDependencies,
): Promise<ReconciliationCheckpoint> {
  let remaining = batchSize;
  let sourceIndex = checkpoint.cursor.sourceIndex;
  let lastProcessedId = checkpoint.cursor.lastProcessedId;
  let processedRecords = checkpoint.processedRecords;

  while (remaining > 0 && sourceIndex < RECONCILIATION_SOURCES.length) {
    const source = RECONCILIATION_SOURCES[sourceIndex];
    const highWaterId = checkpoint.highWaterIds[source];

    if (lastProcessedId >= highWaterId) {
      sourceIndex += 1;
      lastProcessedId = 0;
      continue;
    }

    const records = await dependencies.findSourceRecords({
      source,
      tenantId: checkpoint.tenantId,
      afterId: lastProcessedId,
      highWaterId,
      limit: remaining,
    });

    for (const record of records) {
      await dependencies.validateSourceRecord(source, record, checkpoint.tenantId);
    }

    if (records.length === 0) {
      sourceIndex += 1;
      lastProcessedId = 0;
      continue;
    }

    lastProcessedId = records.at(-1)?.id ?? lastProcessedId;
    processedRecords += records.length;
    remaining -= records.length;

    if (lastProcessedId >= highWaterId) {
      sourceIndex += 1;
      lastProcessedId = 0;
    }
  }

  const completed = sourceIndex >= RECONCILIATION_SOURCES.length;
  return {
    ...checkpoint,
    status: completed ? 'completed' : 'running',
    cursor: {
      source: completed ? null : RECONCILIATION_SOURCES[sourceIndex],
      sourceIndex,
      lastProcessedId,
    },
    processedRecords,
    updatedAt: dependencies.now(),
    completedNonce: completed ? lockNonce : null,
    error: null,
  };
}

function reconciliationCheckpointKey(runId: string, tenantId: number): string {
  return `entitlement-reconciliation:${runId}:tenant:${tenantId}`;
}

function entitlementEvidenceKey(evidenceId: string, tenantId: number): string {
  return `entitlement-evidence:${evidenceId}:tenant:${tenantId}`;
}

function toRolloutRecord(checkpoint: ReconciliationCheckpoint): Omit<RolloutRecord, 'id'> {
  return {
    idempotencyKey: reconciliationCheckpointKey(checkpoint.runId, checkpoint.tenantId),
    payload: checkpoint,
    state: checkpoint.status === 'completed' ? 'sent' : checkpoint.status === 'failed' ? 'failed' : 'processing',
    lastError: checkpoint.error,
  };
}

function parseCheckpoint(payload: unknown, input: { tenantId: number; runId: string }): ReconciliationCheckpoint {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('version' in payload) ||
    payload.version !== 1 ||
    !('tenantId' in payload) ||
    payload.tenantId !== input.tenantId ||
    !('runId' in payload) ||
    payload.runId !== input.runId
  ) {
    throw new Error('Invalid reconciliation checkpoint');
  }
  return payload as ReconciliationCheckpoint;
}

function parseEvidence(
  payload: unknown,
  input: { tenantId: number; runId: string; evidenceId: string },
): EntitlementEvidencePayload | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('version' in payload) ||
    payload.version !== 1 ||
    !('tenantId' in payload) ||
    payload.tenantId !== input.tenantId ||
    !('runId' in payload) ||
    payload.runId !== input.runId ||
    !('evidenceId' in payload) ||
    payload.evidenceId !== input.evidenceId
  ) {
    return null;
  }
  return payload as EntitlementEvidencePayload;
}

function eventNonce(payload: unknown, tenantId: number): number {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('tenantId' in payload) ||
    payload.tenantId !== tenantId ||
    !('nonce' in payload) ||
    typeof payload.nonce !== 'number'
  ) {
    throw new Error('Activation tail contains an invalid tenant event');
  }
  return payload.nonce;
}

function relationshipId(value: number | { id: number } | null | undefined): number | null {
  if (typeof value === 'number') return value;
  if (value && typeof value.id === 'number') return value.id;
  return null;
}

function batchResult(checkpoint: ReconciliationCheckpoint): ReconciliationBatchResult {
  return {
    status: checkpoint.status,
    processedRecords: checkpoint.processedRecords,
    cursor: {
      source: checkpoint.cursor.source,
      lastProcessedId: checkpoint.cursor.lastProcessedId,
    },
    highWaterIds: checkpoint.highWaterIds,
  };
}
