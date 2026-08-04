import { CAPABILITIES, type Capability, validateCapabilityDependencies } from '@/lib/entitlements/capabilities';

type CapabilityRow = { capability: string };

interface SnapshotShape {
  kind?: unknown;
  planVersion?: unknown;
  pool?: unknown;
  userGrants?: unknown;
  pendingGrants?: unknown;
  quotas?: unknown;
}

interface InvitationTransition {
  previousState?: unknown;
  nextState?: unknown;
  acceptedUser?: unknown;
  usedAt?: unknown;
  cancelledAt?: unknown;
  replacedAt?: unknown;
  replacedBy?: unknown;
  expiresAt?: unknown;
  now?: unknown;
}

interface LegacyInvitation {
  acceptedUser?: unknown;
  createdBy?: unknown;
  email?: unknown;
  role?: unknown;
  state?: unknown;
  usedAt?: unknown;
}

interface LegacyUser {
  email?: unknown;
  id?: unknown;
  owner?: unknown;
  role?: unknown;
}

interface PendingGrantInvitation {
  createdBy?: unknown;
  expiresAt?: unknown;
  role?: unknown;
  state?: unknown;
}

const invitationTransitions = {
  pending: new Set(['accepted', 'cancelled', 'replaced', 'expired']),
  accepted: new Set<string>(),
  cancelled: new Set<string>(),
  replaced: new Set<string>(),
  expired: new Set<string>(),
};

export function isCanonicalCapability(value: string): value is Capability {
  return CAPABILITIES.includes(value as Capability);
}

export function assertCapabilityClosure(capabilities: readonly string[]): void {
  const invalidCapability = capabilities.find((capability) => !isCanonicalCapability(capability));

  if (invalidCapability) {
    throw new Error(`Unknown capability: ${invalidCapability}`);
  }

  const missingDependencies = validateCapabilityDependencies(capabilities as Capability[]);

  if (missingDependencies.length > 0) {
    throw new Error(`Missing capability dependencies: ${missingDependencies.join(', ')}`);
  }
}

export function assertCapabilityRows(rows: unknown): void {
  if (!Array.isArray(rows)) {
    throw new Error('Capabilities must be an array');
  }

  const capabilities = rows.map((row) => {
    if (!isCapabilityRow(row)) {
      throw new Error('Capability rows must include a capability');
    }

    return row.capability;
  });

  assertCapabilityClosure(capabilities);
}

export function assertSnapshotShape(snapshot: SnapshotShape): void {
  if (snapshot.kind === 'plan') {
    if (!snapshot.planVersion) {
      throw new Error('Plan snapshots require planVersion');
    }

    if (
      !isEmptyOptionalArray(snapshot.pool) ||
      !isEmptyOptionalArray(snapshot.userGrants) ||
      !isEmptyOptionalArray(snapshot.pendingGrants) ||
      !isEmptyOptionalObject(snapshot.quotas)
    ) {
      throw new Error('Plan snapshots cannot contain custom fields');
    }

    return;
  }

  if (snapshot.kind === 'custom') {
    if (snapshot.planVersion !== undefined) {
      throw new Error('Custom snapshots cannot contain planVersion');
    }

    if (
      snapshot.pool === undefined ||
      snapshot.userGrants === undefined ||
      snapshot.pendingGrants === undefined ||
      snapshot.quotas === undefined
    ) {
      throw new Error('Custom snapshots require pool, userGrants, pendingGrants, and quotas');
    }

    assertCapabilityRows(snapshot.pool);
    assertGrantCapabilities(snapshot.userGrants);
    assertGrantCapabilities(snapshot.pendingGrants);
    assertCustomQuotas(snapshot.quotas);
    return;
  }

  throw new Error('Snapshot kind must be plan or custom');
}

function isEmptyOptionalArray(value: unknown): boolean {
  return value === undefined || value === null || (Array.isArray(value) && value.length === 0);
}

function isEmptyOptionalObject(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => entry === undefined || entry === null);
}

export function assertTrustedWrite(context: unknown, operation: string): void {
  if (!isTrustedEntitlementContext(context)) {
    throw new Error(`${operation} requires trusted context`);
  }
}

export function isTrustedEntitlementContext(value: unknown): value is { entitlementMutation: true } {
  return isRecord(value) && value.entitlementMutation === true;
}

export function resolveEntitlementNow(context: unknown): string {
  if (
    !isTrustedEntitlementContext(context) ||
    !('entitlementNow' in context) ||
    typeof context.entitlementNow !== 'string' ||
    !Number.isFinite(Date.parse(context.entitlementNow))
  ) {
    throw new Error('Entitlement mutation requires an explicit authoritative time');
  }
  return context.entitlementNow;
}

export function isPendingGrantInvitationValid(
  invitation: PendingGrantInvitation,
  tenantId: number,
  now: string,
): boolean {
  return (
    invitation.createdBy === tenantId &&
    invitation.role === 'seller' &&
    invitation.state === 'pending' &&
    typeof invitation.expiresAt === 'string' &&
    Number.isFinite(Date.parse(invitation.expiresAt)) &&
    Date.parse(invitation.expiresAt) > Date.parse(now)
  );
}

export function assertInvitationTransition({
  previousState,
  nextState,
  acceptedUser,
  usedAt,
  cancelledAt,
  replacedAt,
  replacedBy,
  expiresAt,
  now,
}: InvitationTransition): void {
  if (nextState === 'pending') {
    assertNoTerminalMetadata({ acceptedUser, usedAt, cancelledAt, replacedAt, replacedBy }, 'Pending invitations');
    if (previousState === undefined) return;
  }

  if (
    !isInvitationState(previousState) ||
    !isInvitationState(nextState) ||
    !invitationTransitions[previousState].has(nextState)
  ) {
    throw new Error(`Invalid invitation transition from ${String(previousState)} to ${String(nextState)}`);
  }

  if (nextState === 'accepted') {
    if (!isPresent(acceptedUser) || !isPresent(usedAt)) {
      throw new Error('Accepted invitations require acceptedUser and usedAt');
    }
    assertAbsent([cancelledAt, replacedAt, replacedBy], 'Accepted invitations forbid cancel or replace metadata');
  }

  if (nextState === 'cancelled') {
    if (!isPresent(cancelledAt)) {
      throw new Error('Cancelled invitations require cancelledAt');
    }
    assertAbsent(
      [acceptedUser, usedAt, replacedAt, replacedBy],
      'Cancelled invitations forbid accepted or replaced metadata',
    );
  }

  if (nextState === 'replaced') {
    if (!isPresent(replacedAt) || !isPresent(replacedBy)) {
      throw new Error('Replaced invitations require replacedAt and replacedBy');
    }
    assertAbsent([acceptedUser, usedAt, cancelledAt], 'Replaced invitations forbid accepted or cancelled metadata');
  }

  if (nextState === 'expired') {
    if (typeof expiresAt !== 'string' || typeof now !== 'string' || Date.parse(expiresAt) > Date.parse(now)) {
      throw new Error('Expired invitations require expiresAt at or before the transition time');
    }
    assertAbsent(
      [acceptedUser, usedAt, cancelledAt, replacedAt, replacedBy],
      'Expired invitations forbid terminal metadata',
    );
  }
}

export function denyInvitationDelete(): false {
  return false;
}

export function resolveInvitationCreator(value: unknown, requestUserId: unknown, context: unknown): number | undefined {
  if (isTrustedEntitlementContext(context)) {
    return typeof value === 'number' ? value : undefined;
  }
  return typeof requestUserId === 'number' ? requestUserId : undefined;
}

export function deriveLegacyAcceptedUser(invitation: LegacyInvitation, users: readonly LegacyUser[]): number {
  if (
    (invitation.role !== 'seller' && invitation.role !== 'owner') ||
    typeof invitation.email !== 'string' ||
    !isPresent(invitation.usedAt)
  ) {
    throw new Error('Legacy accepted invitation is missing role, email, or usedAt');
  }
  if (invitation.role === 'seller' && typeof invitation.createdBy !== 'number') {
    throw new Error('Legacy seller invitation is missing tenant');
  }

  const normalizedEmail = normalizeEmail(invitation.email);
  const matches = users.filter((user) => {
    if (typeof user.id !== 'number' || typeof user.email !== 'string') return false;
    if (normalizeEmail(user.email) !== normalizedEmail || user.role !== invitation.role) return false;
    if (invitation.role === 'owner') return user.owner === null || user.owner === undefined;
    return user.owner === invitation.createdBy;
  });

  if (matches.length === 0) {
    throw new Error('Missing legacy invitation accepted user');
  }
  if (matches.length > 1) {
    throw new Error('Ambiguous legacy invitation accepted user');
  }

  const match = matches[0];
  if (!match || typeof match.id !== 'number') {
    throw new Error('Missing legacy invitation accepted user');
  }
  return match.id;
}

export function canRollbackLegacyInvitation(invitation: LegacyInvitation, users: readonly LegacyUser[]): boolean {
  if (invitation.state !== 'accepted' || typeof invitation.acceptedUser !== 'number') return false;
  return deriveLegacyAcceptedUser(invitation, users) === invitation.acceptedUser;
}

function assertGrantCapabilities(grants: unknown): void {
  if (!Array.isArray(grants)) {
    throw new Error('Snapshot grants must be arrays');
  }

  for (const grant of grants) {
    if (!isRecord(grant)) {
      throw new Error('Snapshot grant must be an object');
    }

    assertCapabilityRows(grant.capabilities);
  }
}

function assertCustomQuotas(quotas: unknown): void {
  if (!isRecord(quotas)) {
    throw new Error('Custom snapshots require quotas');
  }

  for (const field of ['maxSellerSeats', 'maxProducts', 'maxVariantsPerProduct', 'maxVariantsPerTenant']) {
    const value = quotas[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`Custom snapshot quotas require ${field}`);
    }
  }
}

function isCapabilityRow(value: unknown): value is CapabilityRow {
  return isRecord(value) && typeof value.capability === 'string';
}

function isInvitationState(value: unknown): value is keyof typeof invitationTransitions {
  return typeof value === 'string' && value in invitationTransitions;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertNoTerminalMetadata(metadata: Record<string, unknown>, subject: string): void {
  assertAbsent(Object.values(metadata), `${subject} forbid terminal metadata`);
}

function assertAbsent(values: readonly unknown[], message: string): void {
  if (values.some(isPresent)) {
    throw new Error(message);
  }
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
