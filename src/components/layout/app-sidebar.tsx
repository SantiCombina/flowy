'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  ClipboardList,
  Contact,
  History,
  LayoutDashboard,
  Package,
  PackageSearch,
  ShoppingCart,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getHistoryAction } from '@/components/history/actions';
import { getVariantsAction } from '@/components/products/actions';
import { useUserOptional } from '@/components/providers/user-provider';
import { getSalesAction } from '@/components/sales/actions';
import { getSellersAction } from '@/components/sellers/actions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { FeatureFlags } from '@/lib/features';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type FeatureKey = keyof FeatureFlags | null;

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: FeatureKey;
  roleOnly?: 'admin' | 'owner' | 'seller';
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard, feature: null },
  { title: 'Productos', href: '/products', icon: Package, feature: 'products' },
  { title: 'Vendedores', href: '/sellers', icon: Users, feature: 'sellers', roleOnly: 'owner' },
  { title: 'Asignaciones', href: '/assignments', icon: ClipboardList, feature: 'assignments', roleOnly: 'owner' },
  { title: 'Historial', href: '/history', icon: History, feature: 'history', roleOnly: 'owner' },
  { title: 'Ventas', href: '/sales', icon: ShoppingCart, feature: 'sales' },
  { title: 'Clientes', href: '/clients', icon: Contact, feature: 'clients' },
  { title: 'Mi Inventario', href: '/mobile-inventory', icon: PackageSearch, feature: null, roleOnly: 'seller' },
];

interface AppSidebarProps {
  features: FeatureFlags;
}

export function AppSidebar({ features }: AppSidebarProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const user = useUserOptional();
  const isCollapsed = state === 'collapsed';
  const queryClient = useQueryClient();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handlePrefetch = (href: string) => {
    switch (href) {
      case '/products':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.products.list('', 1),
          queryFn: () => getVariantsAction({ options: { limit: 50, page: 1, sort: 'product' } }),
          staleTime: 30_000,
        });
        break;
      case '/sales':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.sales.list(),
          queryFn: () => getSalesAction(),
          staleTime: 10_000,
        });
        break;
      case '/sellers':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.sellers.list(),
          queryFn: () => getSellersAction(),
          staleTime: 30_000,
        });
        break;
      case '/history':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.history.list(),
          queryFn: () => getHistoryAction({ limit: 500 }),
          staleTime: 60_000,
        });
        break;
    }
  };

  const filteredMainNav = useMemo(
    () =>
      mainNavItems.filter((item) => {
        if (item.feature !== null && !features[item.feature]) return false;
        if (item.roleOnly && user?.role !== item.roleOnly) return false;
        return true;
      }),
    [features, user],
  );

  const getIsActive = (item: NavItem): boolean => {
    const path = item.href;
    return path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(path + '/');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-6 py-6 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl transition-colors hover:bg-sidebar-accent/60 group-data-[collapsible=icon]:hover:bg-transparent"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-900/40 transition-all duration-300 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:rounded-full">
            <Box className="h-5 w-5 text-white" />
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden transition-[width,opacity] duration-300 ease-in-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="text-sm font-bold tracking-tight text-sidebar-foreground whitespace-nowrap">Flowy</span>
            <span className="truncate text-xs text-sidebar-foreground/55 whitespace-nowrap">
              {user?.businessName?.trim() || 'Mi negocio'}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-6 group-data-[collapsible=icon]:px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            Menú
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Navegación principal">
              <SidebarMenu className="gap-0.5 group-data-[collapsible=icon]:gap-2">
                {filteredMainNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={getIsActive(item)}
                      tooltip={item.title}
                      size="default"
                      className={cn(
                        'h-10 rounded-xl px-3 gap-3 transition-all duration-200',
                        'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                        'data-[active=true]:bg-[oklch(0.30_0.03_50)] data-[active=true]:text-warning data-[active=true]:shadow-none',
                        'group-data-[collapsible=icon]:!rounded-full group-data-[collapsible=icon]:!h-8',
                      )}
                    >
                      <Link href={item.href} onClick={handleNavClick} onMouseEnter={() => handlePrefetch(item.href)}>
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="font-medium group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!isMobile && (
        <div
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          className={cn(
            'group/rail absolute inset-y-0 -right-3 z-20 w-6',
            'after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent after:transition-colors after:duration-200',
            'hover:after:bg-sidebar-border/60',
            isCollapsed ? 'cursor-e-resize' : 'cursor-w-resize',
          )}
        />
      )}
    </Sidebar>
  );
}
