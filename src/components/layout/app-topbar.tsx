'use client';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useUser } from '@/components/providers/user-provider';
import { NewSaleButton } from '@/components/sales/new-sale-button';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { UserDropdown } from './user-dropdown';

export function AppTopbar() {
  const user = useUser();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
        {(user?.role === 'seller' || user?.role === 'owner') && <NewSaleButton />}
        <NotificationBell />
        <UserDropdown user={user} />
      </div>
    </header>
  );
}
