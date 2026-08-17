'use server';

import { cookies } from 'next/headers';

import { acceptInvitation, validateInvitation } from '@/app/services/invitations';
import {
  forgotPassword as forgotPasswordService,
  loginUser as loginUserService,
  resetPassword as resetPasswordService,
} from '@/app/services/users';
import { actionClient } from '@/lib/safe-action';
import { forgotPasswordSchema } from '@/schemas/auth/forgot-password-schema';
import { loginSchema } from '@/schemas/auth/login-schema';
import { registerSchema } from '@/schemas/auth/register-schema';
import { resetPasswordSchema } from '@/schemas/auth/reset-password-schema';

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
    maxAge: 60 * 60 * 24 * 30,
  });

  return { success: true };
});

export const registerUser = actionClient.schema(registerSchema).action(async ({ parsedInput }) => {
  const { email, password, token } = parsedInput;

  const invitationResult = await validateInvitation(token);

  if (!invitationResult.valid || !invitationResult.invitation) {
    return { error: invitationResult.error ?? 'Invitación inválida' };
  }

  const { invitation } = invitationResult;

  await acceptInvitation(token, invitation.name, email, password);

  return { success: true };
});

export const forgotPasswordAction = actionClient.schema(forgotPasswordSchema).action(async ({ parsedInput }) => {
  try {
    await forgotPasswordService(parsedInput.email);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al enviar el enlace de recuperación';
    return { error: message };
  }
});

export const resetPasswordAction = actionClient.schema(resetPasswordSchema).action(async ({ parsedInput }) => {
  try {
    await resetPasswordService(parsedInput.token, parsedInput.password);
    return { success: true };
  } catch {
    return { error: 'El enlace de recuperación es inválido o ha expirado.' };
  }
});
