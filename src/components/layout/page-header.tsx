'use client';

import { Bell, Search } from 'lucide-react';
import type { ReactNode } from 'react';

import { useUser } from '@/components/providers/user-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <header className="flex h-16 items-center justify-between border-b bg-card px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar productos, vendedores..." className="w-80 pl-9" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative rounded-full">
            <Bell className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </span>
          </Button>
          <UserDropdown user={user} />
        </div>
      </header>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-stretch sm:justify-between gap-4 h-full">
          <div className="flex flex-col justify-between flex-1">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>
          {actions && <div className="flex items-end sm:items-end shrink-0 h-full">{actions}</div>}
        </div>
      </div>
    </>
  );
}
