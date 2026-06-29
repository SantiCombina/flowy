import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { SettingsFetcher } from '@/app/(frontend)/(main)/settings-fetcher';
import { getOwnerById } from '@/app/services/users';
import { AppLayout } from '@/components/layout/app-layout';
import { PushRegistration } from '@/components/notifications/push-registration';
import { QueryProvider } from '@/components/providers/query-provider';
import { UserProvider } from '@/components/providers/user-provider';
import { Toaster } from '@/components/ui/sonner';
import { SettingsProvider } from '@/contexts/settings-context';
import { getFeatureFlags } from '@/lib/features';
import { getCurrentUser } from '@/lib/payload';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const features = getFeatureFlags();
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  const ownerForSeller =
    user.role === 'seller' && typeof user.owner === 'number' ? await getOwnerById(user.owner) : null;

  const businessName = user.role === 'owner' ? (user.businessName ?? null) : (ownerForSeller?.businessName ?? null);

  const fallback = (
    <SettingsProvider initialSettings={null}>
      <QueryProvider>
        <AppLayout features={features} defaultSidebarOpen={sidebarOpen}>
          {children}
        </AppLayout>
      </QueryProvider>
    </SettingsProvider>
  );

  return (
    <UserProvider
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName,
      }}
    >
      <Suspense fallback={fallback}>
        <SettingsFetcher userId={user.id}>
          <QueryProvider>
            <AppLayout features={features} defaultSidebarOpen={sidebarOpen}>
              {children}
            </AppLayout>
          </QueryProvider>
        </SettingsFetcher>
        <PushRegistration />
        <Toaster />
      </Suspense>
    </UserProvider>
  );
}
