import type { Metadata } from 'next';

import { ProfileSection } from '@/components/profile/profile-section';
import { getCurrentUser } from '@/lib/payload';

export const metadata: Metadata = {
  title: 'Perfil',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <ProfileSection
      phone={user?.phone ?? null}
      dni={user?.dni ?? null}
      cuitCuil={user?.cuitCuil ?? null}
      cbu={user?.cbu ?? null}
      businessName={user?.businessName ?? null}
    />
  );
}
