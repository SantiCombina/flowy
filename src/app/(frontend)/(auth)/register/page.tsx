import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear cuenta',
  description: 'Creá tu cuenta en Flowy y empezá a gestionar tu negocio.',
};

import { validateInvitation } from '@/app/services/invitations';
import { RegisterForm } from '@/components/auth/register-form';

interface RegisterPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <RegisterForm />
      </div>
    );
  }

  const result = await validateInvitation(token);

  if (!result.valid || !result.invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <RegisterForm />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <RegisterForm email={result.invitation.email} token={token} role={result.invitation.role} />
    </div>
  );
}
