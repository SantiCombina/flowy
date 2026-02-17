'use server';

import { cookies } from 'next/headers';

import { markInvitationAsUsed, validateInvitation } from '@/app/services/invitations';
import { createUser, loginUser as loginUserService } from '@/app/services/users';
import { actionClient } from '@/lib/safe-action';
import { loginSchema } from '@/schemas/auth/login-schema';
import { registerSchema } from '@/schemas/auth/register-schema';

export const loginUser = actionClient.schema(loginSchema).action(async ({ parsedInput }) => {
  const { email, password } = parsedInput;

  const result = await loginUserService({ email, password });

  if (!result.success || !result.token) {
    return { error: result.error ?? 'Credenciales inválidas' };
  }

  const cookieStore = await cookies();
  cookieStore.set('payload-token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax',
  });

  return { success: true };
});

export const registerUser = actionClient.schema(registerSchema).action(async ({ parsedInput }) => {
  const { name, email, password, token } = parsedInput;

  const invitationResult = await validateInvitation(token);

  if (!invitationResult.valid || !invitationResult.invitation) {
    return { error: invitationResult.error ?? 'Invitación inválida' };
  }

  const { invitation } = invitationResult;

  if (invitation.email !== email) {
    return { error: 'El email no coincide con la invitación' };
  }

  const userResult = await createUser({
    name,
    email,
    password,
    role: invitation.role,
    ...(invitation.role === 'seller' && invitation.createdBy ? { owner: invitation.createdBy } : {}),
  });

  if (!userResult.success) {
    return { error: userResult.error ?? 'Error al crear la cuenta' };
  }

  await markInvitationAsUsed(invitation.id);

  return { success: true };
});
