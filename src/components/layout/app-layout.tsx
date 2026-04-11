'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { FeatureFlags } from '@/lib/features';

import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  features: FeatureFlags;
  defaultSidebarOpen?: boolean;
}

export function AppLayout({ children, features, defaultSidebarOpen = true }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar features={features} />
      <SidebarInset>
        <AppTopbar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
