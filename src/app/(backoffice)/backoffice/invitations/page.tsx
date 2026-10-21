import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { listAdminOwnerInvitations } from '@/app/services/backoffice/invitations';
import { InvitationsList } from '@/components/backoffice/invitations/invitations-list';
import { PageHeader } from '@/components/layout/page-header';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { invitationListSchema } from '@/schemas/backoffice/invitation-list-schema';

export const metadata: Metadata = { title: 'Invitaciones' };

interface InvitationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BackofficeInvitationsPage({ searchParams }: InvitationsPageProps) {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') redirect('/dashboard');
  const filters = invitationListSchema.parse(await searchParams);
  const data = await listAdminOwnerInvitations(filters);
  return (
    <>
      <PageHeader title="Invitaciones" description="Seguimiento de invitaciones para nuevos negocios" />
      <InvitationsList data={data} filters={filters} />
    </>
  );
}
