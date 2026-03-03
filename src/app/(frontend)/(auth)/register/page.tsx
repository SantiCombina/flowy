import { getPayload } from 'payload';

import { RegisterForm } from '@/components/auth/register-form';

import config from '@payload-config';

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

  const payload = await getPayload({ config });

  const { docs: invitations } = await payload.find({
    collection: 'invitations',
    where: {
      and: [
        { token: { equals: token } },
        { usedAt: { exists: false } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 1,
  });

  const invitation = invitations[0];

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <RegisterForm />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <RegisterForm email={invitation.email} token={token} role={invitation.role} />
    </div>
  );
}
