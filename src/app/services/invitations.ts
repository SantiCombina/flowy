'use server';

import type { Where } from 'payload';

import {
  buildInvitationAcceptanceData,
  buildInvitationCreateData,
  buildInvitationValidationWhere,
  isInvitationUsable,
} from '@/lib/entitlements/invitation-boundary';
import { acquireTenantLock, type LockContext, type LockDependencies } from '@/lib/entitlements/locks';
import { countSeats, snapshotQuotas, type CountContext, type CountDependencies } from '@/lib/entitlements/quotas';
import type { Invitation, TenantEntitlementSnapshot, User } from '@/payload-types';

async function getPayloadClient() {
  const payload = await import('@/lib/payload');
  return payload.getPayloadClient();
}

interface ValidateInvitationResult {
  valid: boolean;
  invitation?: {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'seller';
    createdBy: number | null;
  };
  error?: string;
}

interface InvitationCreateArguments {
  collection: 'invitations';
  data: ReturnType<typeof buildInvitationCreateData>;
  overrideAccess: true;
  context: { entitlementMutation: true };
  req?: { transactionID: string | number };
}

interface InvitationFindArguments {
  collection: 'invitations';
  where: Where;
  limit: 1;
  overrideAccess: true;
}

interface InvitationUpdateArguments {
  collection: 'invitations';
  id: number;
  data: ReturnType<typeof buildInvitationAcceptanceData>;
  overrideAccess: true;
  context: { entitlementMutation: true };
  req?: { transactionID: string | number };
}

export interface InvitationServiceDependencies {
  now(): string;
  create(args: InvitationCreateArguments): Promise<Invitation>;
  find(args: InvitationFindArguments): Promise<{ docs: Invitation[] }>;
  update(args: InvitationUpdateArguments): Promise<unknown>;
}

export interface SeatCheckedInvitationDependencies {
  transactionID: string | number;
  now: string;
  lock: LockDependencies;
  lockContext: LockContext;
  count: CountDependencies;
  countContext: CountContext;
  createInvitation(args: InvitationCreateArguments): Promise<Invitation>;
  findSnapshot(args: unknown): Promise<{ docs: TenantEntitlementSnapshot[] }>;
  findUserById(args: unknown): Promise<User>;
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

export interface AcceptInvitationDependencies {
  transactionID: string | number;
  now: string;
  tenantId: number;
  lock: LockDependencies;
  lockContext: LockContext;
  findInvitation(args: unknown): Promise<{ docs: Invitation[] }>;
  createUser(args: unknown): Promise<User>;
  updateInvitation(args: InvitationUpdateArguments): Promise<unknown>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export async function createInvitation(
  name: string,
  email: string,
  ownerId: number,
  dependencies?: InvitationServiceDependencies,
): Promise<Invitation> {
  const operations = dependencies ?? (await defaultInvitationDependencies());

  const invitation = await operations.create({
    collection: 'invitations',
    data: buildInvitationCreateData(name, email, ownerId),
    overrideAccess: true,
    context: { entitlementMutation: true },
  });

  return invitation;
}

export async function validateInvitation(
  token: string,
  dependencies?: InvitationServiceDependencies,
): Promise<ValidateInvitationResult> {
  const operations = dependencies ?? (await defaultInvitationDependencies());
  const now = operations.now();

  const { docs: invitations } = await operations.find({
    collection: 'invitations',
    where: buildInvitationValidationWhere(token, now),
    limit: 1,
    overrideAccess: true,
  });

  const invitation = invitations[0];

  if (!invitation || !isInvitationUsable(invitation, now)) {
    return { valid: false, error: 'Invitación inválida o expirada' };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role as 'owner' | 'seller',
      createdBy: typeof invitation.createdBy === 'number' ? invitation.createdBy : (invitation.createdBy?.id ?? null),
    },
  };
}

export async function markInvitationAsUsed(
  id: number,
  acceptedUserId: number,
  dependencies?: InvitationServiceDependencies,
): Promise<void> {
  const operations = dependencies ?? (await defaultInvitationDependencies());

  await operations.update({
    collection: 'invitations',
    id,
    data: buildInvitationAcceptanceData(acceptedUserId, operations.now()),
    overrideAccess: true,
    context: { entitlementMutation: true },
  });
}

export async function createSellerInvitation(
  name: string,
  email: string,
  ownerId: number,
  dependencies?: SeatCheckedInvitationDependencies,
): Promise<Invitation> {
  if (dependencies) {
    return runCreateSellerInvitation(name, email, ownerId, dependencies);
  }

  const deps = await defaultSeatCheckedInvitationDependencies(ownerId);
  try {
    const invitation = await runCreateSellerInvitation(name, email, ownerId, deps);
    await deps.commit();
    return invitation;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

export async function acceptInvitation(
  token: string,
  name: string,
  email: string,
  password: string,
  dependencies?: AcceptInvitationDependencies,
): Promise<User> {
  if (dependencies) {
    return runAcceptInvitation(token, name, email, password, dependencies);
  }

  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const now = new Date().toISOString();
  const preflight = await payload.find({
    collection: 'invitations',
    where: buildInvitationValidationWhere(token, now),
    limit: 1,
    overrideAccess: true,
    req: { transactionID },
  });
  const invitation = (preflight.docs as Invitation[])[0];

  if (!invitation || !isInvitationUsable(invitation, now)) {
    await payload.db.rollbackTransaction(transactionID);
    throw new Error('Invitación inválida o expirada');
  }

  const tenantId = typeof invitation.createdBy === 'number' ? invitation.createdBy : (invitation.createdBy?.id ?? 0);
  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  const deps: AcceptInvitationDependencies = {
    transactionID,
    now,
    tenantId,
    lock,
    lockContext: { transactionID, tenantId },
    findInvitation: async (args) => payload.find(args as never) as unknown as Promise<{ docs: Invitation[] }>,
    createUser: async (args) => payload.create(args as never) as unknown as Promise<User>,
    updateInvitation: async (args) => payload.update(args as never) as unknown,
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };

  try {
    const user = await runAcceptInvitation(token, name, email, password, deps);
    await deps.commit();
    return user;
  } catch (error) {
    await deps.rollback();
    throw error;
  }
}

async function runCreateSellerInvitation(
  name: string,
  email: string,
  ownerId: number,
  dependencies: SeatCheckedInvitationDependencies,
): Promise<Invitation> {
  const mutationNonce = await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const snapshot = await resolveTenantSnapshot(dependencies, ownerId);
  const quotas = snapshot ? snapshotQuotas(snapshot) : null;
  const maxSeats = quotas?.maxSellerSeats ?? 0;

  if (maxSeats > 0) {
    const usedSeats = await countSeats(dependencies.count, dependencies.countContext);
    if (usedSeats >= maxSeats) {
      throw new Error('No hay asientos de vendedor disponibles');
    }
  }

  const invitation = await dependencies.createInvitation({
    collection: 'invitations',
    data: buildInvitationCreateData(name, email, ownerId),
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  await dependencies.emitMutation({
    collection: 'entitlement-outbox',
    data: {
      idempotencyKey: `mutation:${ownerId}:${mutationNonce}`,
      kind: 'entitlement.mutation',
      aggregate: `tenant:${ownerId}`,
      payload: { tenantId: ownerId, nonce: mutationNonce },
      state: 'sent',
      attempts: 0,
      availableAt: dependencies.now,
    },
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  return invitation;
}

async function runAcceptInvitation(
  token: string,
  name: string,
  email: string,
  password: string,
  dependencies: AcceptInvitationDependencies,
): Promise<User> {
  await acquireTenantLock(dependencies.lock, dependencies.lockContext);

  const now = dependencies.now;
  const { docs: invitations } = await dependencies.findInvitation({
    collection: 'invitations',
    where: buildInvitationValidationWhere(token, now),
    limit: 1,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  const invitation = invitations[0];
  if (!invitation || !isInvitationUsable(invitation, now)) {
    throw new Error('Invitación inválida o expirada');
  }

  if (invitation.email !== email) {
    throw new Error('El email no coincide con la invitación');
  }

  const ownerId = typeof invitation.createdBy === 'number' ? invitation.createdBy : invitation.createdBy?.id;

  const existingUser = await dependencies
    .createUser({
      collection: 'users',
      data: {
        name,
        email,
        password,
        role: invitation.role,
        ...(invitation.role === 'seller' && ownerId ? { owner: ownerId } : {}),
      },
      overrideAccess: true,
      context: { entitlementMutation: true },
      req: { transactionID: dependencies.transactionID },
    })
    .catch((error: Error) => {
      if (error.message?.includes('email') || error.message?.includes('duplicate')) {
        throw new Error('El email ya está registrado');
      }
      throw error;
    });

  await dependencies.updateInvitation({
    collection: 'invitations',
    id: invitation.id,
    data: buildInvitationAcceptanceData(existingUser.id, now),
    overrideAccess: true,
    context: { entitlementMutation: true },
    req: { transactionID: dependencies.transactionID },
  });

  return existingUser;
}

async function resolveTenantSnapshot(
  dependencies: SeatCheckedInvitationDependencies,
  tenantId: number,
): Promise<TenantEntitlementSnapshot | null> {
  const user = await dependencies.findUserById({
    collection: 'users',
    id: tenantId,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });
  const snapshotId =
    typeof user.activeEntitlementSnapshot === 'number'
      ? user.activeEntitlementSnapshot
      : (user.activeEntitlementSnapshot?.id ?? null);

  if (snapshotId === null) return null;

  const result = await dependencies.findSnapshot({
    collection: 'tenant-entitlement-snapshots',
    where: {
      and: [{ tenant: { equals: tenantId } }, { id: { equals: snapshotId } }],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
    req: { transactionID: dependencies.transactionID },
  });

  return result.docs[0] ?? null;
}

async function defaultInvitationDependencies(): Promise<InvitationServiceDependencies> {
  const { getPayloadClient } = await import('@/lib/payload');
  const payload = await getPayloadClient();

  return {
    now: () => new Date().toISOString(),
    create: async (args) => {
      const invitation = await payload.create(args);
      return invitation as Invitation;
    },
    find: async (args) => {
      const result = await payload.find(args);
      return { docs: result.docs as Invitation[] };
    },
    update: async (args) => payload.update(args),
  };
}

async function defaultSeatCheckedInvitationDependencies(ownerId: number): Promise<SeatCheckedInvitationDependencies> {
  const payload = await getPayloadClient();
  const transactionID = await payload.db.beginTransaction();
  if (!transactionID) {
    throw new Error('No se pudo iniciar la transacción de base de datos');
  }

  const { defaultLockDependencies } = await import('@/lib/entitlements/locks');
  const lock = await defaultLockDependencies();

  const now = new Date().toISOString();

  return {
    transactionID,
    now,
    lock,
    lockContext: { transactionID, tenantId: ownerId },
    count: {
      findUsers: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findInvitations: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findProducts: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
      findVariants: async (args) => payload.find(args as never) as unknown as { docs: unknown[]; totalDocs: number },
    },
    countContext: { transactionID, tenantId: ownerId, now },
    createInvitation: async (args) => payload.create(args as never) as unknown as Promise<Invitation>,
    findSnapshot: async (args) =>
      payload.find(args as never) as unknown as Promise<{ docs: TenantEntitlementSnapshot[] }>,
    findUserById: async (args) => payload.findByID(args as never) as unknown as Promise<User>,
    emitMutation: async (args) => payload.create(args as never) as unknown,
    commit: async () => {
      await payload.db.commitTransaction(transactionID);
    },
    rollback: async () => {
      await payload.db.rollbackTransaction(transactionID);
    },
  };
}
