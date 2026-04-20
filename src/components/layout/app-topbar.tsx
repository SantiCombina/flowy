'use client';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useUser } from '@/components/providers/user-provider';
import { NewSaleButton } from '@/components/sales/new-sale-button';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { UserDropdown } from './user-dropdown';

export function AppTopbar() {
  const user = useUser();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border/50 bg-background/95 backdrop-blur-sm px-4 sm:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden mr-auto" />
      <div className="flex items-center gap-3 [&_[data-slot=button][data-variant=default]]:shadow-md [&_[data-slot=button][data-variant=default]]:shadow-primary/20">
        {(user?.role === 'seller' || user?.role === 'owner') && <NewSaleButton />}
        <NotificationBell />
        <UserDropdown user={user} />
      </div>
    </header>
  );
}
