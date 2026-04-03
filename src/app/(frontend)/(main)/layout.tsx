import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getOwnerById } from '@/app/services/users';
import { AppLayout } from '@/components/layout/app-layout';
import { PushRegistration } from '@/components/notifications/push-registration';
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
  const cookieStore = await cookies();
  const sidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  const ownerForSeller =
    user.role === 'seller' && typeof user.owner === 'number' ? await getOwnerById(user.owner) : null;

  const businessName = user.role === 'owner' ? (user.businessName ?? null) : (ownerForSeller?.businessName ?? null);

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
      <SettingsProvider>
        <SalesRefreshProvider>
          <AppLayout features={features} defaultSidebarOpen={sidebarOpen}>
            {children}
          </AppLayout>
        </SalesRefreshProvider>
        <PushRegistration />
        <Toaster />
      </SettingsProvider>
    </UserProvider>
  );
}
