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
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          {user?.role === 'seller' && <NewSaleButton />}
          <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notificaciones">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              3
            </span>
          </Button>
          <UserDropdown user={user} />
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </div>
    </>
  );
}
