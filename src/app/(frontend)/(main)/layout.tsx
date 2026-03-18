import { redirect } from 'next/navigation';

import { AppLayout } from '@/components/layout/app-layout';
import { UserProvider } from '@/components/providers/user-provider';
import { Toaster } from '@/components/ui/sonner';
import { SalesRefreshProvider } from '@/contexts/sales-refresh-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { getFeatureFlags } from '@/lib/features';
import { getCurrentUser } from '@/lib/payload';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const features = getFeatureFlags();

  return (
    <UserProvider
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      <SettingsProvider>
        <SalesRefreshProvider>
          <AppLayout features={features}>{children}</AppLayout>
        </SalesRefreshProvider>
        <Toaster />
      </SettingsProvider>
    </UserProvider>
  );
}
