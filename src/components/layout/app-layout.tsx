'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { FeatureFlags } from '@/lib/features';

import { AppSidebar } from './app-sidebar';
import { AppTopbar } from './app-topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  features: FeatureFlags;
  capabilities?: string[];
  defaultSidebarOpen?: boolean;
}

export function AppLayout({ children, features, capabilities, defaultSidebarOpen = true }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar features={features} capabilities={capabilities} />
      <SidebarInset>
        <AppTopbar />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
