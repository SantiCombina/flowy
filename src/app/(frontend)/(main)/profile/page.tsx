import type { Metadata } from 'next';

import { ProfileSection } from '@/components/profile/profile-section';

export const metadata: Metadata = {
  title: 'Perfil',
};

export default function ProfilePage() {
  return <ProfileSection />;
}
