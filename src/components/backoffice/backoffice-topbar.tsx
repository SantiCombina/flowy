'use client';

import { UserDropdown } from '@/components/layout/user-dropdown';
import { useUser } from '@/components/providers/user-provider';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function BackofficeTopbar() {
  const user = useUser();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-border/50 bg-background/95 backdrop-blur-sm px-4 sm:px-6 shadow-sm">
      <SidebarTrigger className="md:hidden mr-auto" />
      <div className="flex items-center gap-3">
        <UserDropdown user={user} />
      </div>
    </header>
  );
}
