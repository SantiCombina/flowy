interface InvitationValidationRecord {
  expiresAt?: null | string;
  state?: null | string;
  usedAt?: null | string;
}

export function buildInvitationCreateData(
  name: string,
  email: string,
  businessName?: string,
  role: 'owner' | 'seller' = 'owner',
  createdBy?: number,
) {
  return {
    name,
    email,
    role,
    ...(businessName !== undefined ? { businessName } : {}),
    state: 'pending',
    emailStatus: 'pending',
    ...(createdBy !== undefined ? { createdBy } : {}),
  } satisfies RequiredDataFromCollectionSlug<'invitations'>;
}

export function isInvitationUsable(invitation: InvitationValidationRecord, now: string): boolean {
  return (
    invitation.state === 'pending' &&
    !invitation.usedAt &&
    typeof invitation.expiresAt === 'string' &&
    Date.parse(invitation.expiresAt) > Date.parse(now)
  );
}

export function buildInvitationAcceptanceData(acceptedUserId: number, usedAt: string) {
  return {
    state: 'accepted' as const,
    acceptedUser: acceptedUserId,
    usedAt,
  };
}

export function buildInvitationValidationWhere(token: string, now: string): Where {
  return {
    and: [
      { token: { equals: token } },
      { state: { equals: 'pending' as const } },
      { usedAt: { exists: false } },
      { expiresAt: { greater_than: now } },
    ],
  };
}
import type { RequiredDataFromCollectionSlug, Where } from 'payload';
