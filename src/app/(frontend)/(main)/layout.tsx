import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSettings } from '@/app/services/settings';
import { getOwnerById } from '@/app/services/users';
import { AppLayout } from '@/components/layout/app-layout';
import { PushRegistration } from '@/components/notifications/push-registration';
import { UserProvider } from '@/components/providers/user-provider';
import { Toaster } from '@/components/ui/sonner';
import { SalesRefreshProvider } from '@/contexts/sales-refresh-context';
import { SettingsProvider, type SettingsData } from '@/contexts/settings-context';
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

  const rawSettings = await getSettings(user.id);

  const initialSettings: SettingsData = {
    id: rawSettings.id,
    productsColumns: rawSettings.productsColumns?.map((c) => c.column) ?? [],
    clientsColumns: rawSettings.clientsColumns?.map((c) => c.column) ?? [],
    salesColumns: rawSettings.salesColumns?.map((c) => c.column) ?? [],
    assignmentsColumns: rawSettings.assignmentsColumns?.map((c) => c.column) ?? [],
    historyColumns: rawSettings.historyColumns?.map((c) => c.column) ?? [],
    sellersColumns: rawSettings.sellersColumns?.map((c) => c.column) ?? [],
    itemsPerPage: rawSettings.itemsPerPage ?? '10',
  };

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
      <SettingsProvider initialSettings={initialSettings}>
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
