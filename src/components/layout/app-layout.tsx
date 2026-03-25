'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { FeatureFlags } from '@/lib/features';

import { AppSidebar } from './app-sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  features: FeatureFlags;
  defaultSidebarOpen?: boolean;
}

export function AppLayout({ children, features, defaultSidebarOpen = true }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar features={features} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
