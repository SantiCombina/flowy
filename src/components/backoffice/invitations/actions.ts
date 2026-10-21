'use server';

import { render } from '@react-email/render';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

import { cancelAdminOwnerInvitation, recordAdminInvitationEmailStatus, renewAdminOwnerInvitation } from '@/app/services/backoffice/invitations';
import { InvitationEmail } from '@/emails/invitation-email';
import { cacheTags } from '@/lib/cache-tags';
import { getCurrentUserWithCapabilities } from '@/lib/entitlements/guards';
import { resend } from '@/lib/resend';
import { actionClient } from '@/lib/safe-action';
import { cancelInvitationSchema } from '@/schemas/backoffice/cancel-invitation-schema';
import { resendInvitationSchema } from '@/schemas/backoffice/resend-invitation-schema';

export const cancelInvitationAction = actionClient.schema(cancelInvitationSchema).action(async ({ parsedInput }) => {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') throw new Error('No autorizado');
  await cancelAdminOwnerInvitation(parsedInput.id);
  revalidatePath('/backoffice/invitations');
  revalidatePath('/backoffice/tenants');
  revalidateTag(cacheTags.adminBackofficeInvitations());
  return { success: true };
});

export const resendInvitationAction = actionClient.schema(resendInvitationSchema).action(async ({ parsedInput }) => {
  const guardedUser = await getCurrentUserWithCapabilities();
  if (!guardedUser || guardedUser.user.role !== 'admin') throw new Error('No autorizado');
  const requestHeaders = await headers();
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL ??
    `${requestHeaders.get('x-forwarded-proto') ?? 'http'}://${requestHeaders.get('host') ?? 'localhost:3000'}`;
  const invitation = await renewAdminOwnerInvitation(guardedUser.user.id, parsedInput.id);
  let emailSent = false;
  try {
    const registerUrl = new URL('/register', baseUrl);
    registerUrl.searchParams.set('token', invitation.token);
    if (invitation.businessName) registerUrl.searchParams.set('businessName', invitation.businessName);
    const html = await render(InvitationEmail({ registerUrl: registerUrl.toString(), roleName: 'Dueño' }));
    const { error } = await resend.emails.send({
      from: `Flowy <${process.env.EMAIL_FROM ?? 'noreply@flowy.ar'}>`,
      to: invitation.email,
      subject: 'Invitación a Flowy',
      html,
    }, { idempotencyKey: `invitation-resend-${invitation.id}` });
    emailSent = !error;
  } catch {
    emailSent = false;
  }
  let emailStatusSaved = true;
  try {
    await recordAdminInvitationEmailStatus(invitation.id, emailSent ? 'sent' : 'failed');
  } catch {
    emailStatusSaved = false;
  }
  revalidatePath('/backoffice/invitations');
  revalidatePath('/backoffice/tenants');
  revalidateTag(cacheTags.adminBackofficeInvitations());
  return { success: true, emailSent, emailStatusSaved };
});
