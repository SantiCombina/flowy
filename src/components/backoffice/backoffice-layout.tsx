'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { BackofficeSidebar } from './backoffice-sidebar';
import { BackofficeTopbar } from './backoffice-topbar';

interface BackofficeLayoutProps {
  children: React.ReactNode;
  defaultSidebarOpen?: boolean;
}

export function BackofficeLayout({ children, defaultSidebarOpen = true }: BackofficeLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <BackofficeSidebar />
      <SidebarInset>
        <BackofficeTopbar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
