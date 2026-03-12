'use client';

import { Bell } from 'lucide-react';
import type { ReactNode } from 'react';

import { useUser } from '@/components/providers/user-provider';
import { NewSaleButton } from '@/components/sales/new-sale-button';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { UserDropdown } from './user-dropdown';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const user = useUser();

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          {user?.role === 'seller' && <NewSaleButton />}
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Notificaciones">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </Button>
          <UserDropdown user={user} />
        </div>
      </header>

      <div className="px-4 sm:px-6 py-5">
        <div className="flex flex-row items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground/80">{description}</p>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </>
  );
}
