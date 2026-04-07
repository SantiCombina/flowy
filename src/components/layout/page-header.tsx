'use client';

import type { ReactNode } from 'react';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useUser } from '@/components/providers/user-provider';
import { NewSaleButton } from '@/components/sales/new-sale-button';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { UserDropdown } from './user-dropdown';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  isLoading?: boolean;
  hideTitle?: boolean;
}

export function PageHeader({ title, description, actions, isLoading, hideTitle }: PageHeaderProps) {
  const user = useUser();

  return (
    <>
      <header className="relative flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          {user?.role === 'seller' && <NewSaleButton />}
          <NotificationBell />
          <UserDropdown user={user} />
        </div>
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
            <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-primary" />
          </div>
        )}
      </header>

      {!hideTitle && (
        <div className="px-4 sm:px-6 py-5">
          <div className="flex flex-row items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground/80">{description}</p>
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        </div>
      )}
    </>
  );
}
