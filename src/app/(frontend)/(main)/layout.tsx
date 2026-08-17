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
import { getCurrentUserWithCapabilities, capabilitiesArray } from '@/lib/entitlements/guards';
import { getFeatureFlags } from '@/lib/features';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const guardedUser = await getCurrentUserWithCapabilities();

  if (!guardedUser) {
    redirect('/login');
  }

  const { user, capabilities } = guardedUser;

  if (user.role === 'admin') {
    redirect('/backoffice/dashboard');
  }

  const features = getFeatureFlags();
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  const ownerForSeller =
    user.role === 'seller' && typeof user.owner === 'number' ? await getOwnerById(user.owner) : null;

  const businessName = user.role === 'owner' ? (user.businessName ?? null) : (ownerForSeller?.businessName ?? null);

  const capabilityList = capabilitiesArray(capabilities);

  const fallback = (
    <SettingsProvider initialSettings={null}>
      <QueryProvider>
        <AppLayout features={features} capabilities={capabilityList} defaultSidebarOpen={sidebarOpen}>
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
        capabilities: capabilityList,
      }}
    >
      <Suspense fallback={fallback}>
        <SettingsFetcher userId={user.id}>
          <QueryProvider>
            <AppLayout features={features} capabilities={capabilityList} defaultSidebarOpen={sidebarOpen}>
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
