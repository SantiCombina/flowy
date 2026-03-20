'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { FeatureFlags } from '@/lib/features';

import { AppSidebar } from './app-sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  features: FeatureFlags;
}

export function AppLayout({ children, features }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar features={features} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
