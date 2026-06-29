'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Contact,
  FileText,
  History,
  LayoutDashboard,
  Package,
  PackageSearch,
  ShoppingCart,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import { getBudgetsAction } from '@/components/budgets/actions';
import { getHistoryAction } from '@/components/history/actions';
import { getVariantsAction } from '@/components/products/actions';
import { getCurrentUserAction } from '@/components/profile/actions';
import { useUserOptional } from '@/components/providers/user-provider';
import { getSalesAction } from '@/components/sales/actions';
import { getSellersAction } from '@/components/sellers/actions';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useServerActionQuery } from '@/hooks/use-server-action-query';
import type { FeatureFlags } from '@/lib/features';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type FeatureKey = keyof FeatureFlags | null;

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  feature: FeatureKey;
  roleOnly?: 'admin' | 'owner' | 'seller';
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, feature: null },
  { title: 'Productos', href: '/products', icon: Package, feature: 'products' },
  { title: 'Vendedores', href: '/sellers', icon: Users, feature: 'sellers', roleOnly: 'owner' },
  { title: 'Asignaciones', href: '/assignments', icon: ClipboardList, feature: 'assignments', roleOnly: 'owner' },
  { title: 'Historial', href: '/history', icon: History, feature: 'history', roleOnly: 'owner' },
  { title: 'Ventas', href: '/sales', icon: ShoppingCart, feature: 'sales' },
  { title: 'Presupuestos', href: '/budgets', icon: FileText, feature: 'budgets' },
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

  const { data: currentUser } = useServerActionQuery({
    queryKey: queryKeys.user.current(),
    queryFn: () => getCurrentUserAction(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const businessName = currentUser?.businessName ?? user?.businessName ?? null;

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
      case '/budgets':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.budgets.list(),
          queryFn: () => getBudgetsAction(),
          staleTime: 10_000,
        });
        break;
      case '/sales':
        void queryClient.prefetchQuery({
          queryKey: queryKeys.sales.list({ page: 1, limit: 25, sort: 'date', sortDir: 'desc' }),
          queryFn: () => getSalesAction({ page: 1, limit: 25, sort: 'date', sortDir: 'desc' }),
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
      <div className="relative h-full w-full flex flex-col">
        <SidebarHeader className="absolute top-0 left-0 right-0 z-10 px-3 py-6">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl transition-colors hover:bg-sidebar-accent/60 group-data-[collapsible=icon]:gap-0"
          >
            <Image
              src="/isotipo.png"
              alt="Flowy"
              width={32}
              height={32}
              className="w-8 h-8 min-w-8 shrink-0"
              priority
            />
            <div className="flex min-w-0 flex-col overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
              <span
                className="text-sm font-bold tracking-tight text-sidebar-foreground whitespace-nowrap"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Flowy
              </span>
              <span className="truncate text-xs text-sidebar-foreground/55 whitespace-nowrap">
                {businessName?.trim() || 'Mi negocio'}
              </span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup className="p-0 w-full my-auto">
            <SidebarGroupContent>
              <nav aria-label="Navegación principal">
                <SidebarMenu className="gap-1.5">
                  {filteredMainNav.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={getIsActive(item)}
                        tooltip={item.title}
                        size="default"
                        className={cn(
                          'h-10 rounded-xl p-2.5 gap-3',
                          'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                          'data-[active=true]:bg-[oklch(0.30_0.03_50)] data-[active=true]:text-warning data-[active=true]:shadow-none',
                          'group-data-[collapsible=icon]:w-10! group-data-[collapsible=icon]:p-2.5!',
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={handleNavClick}
                          onMouseEnter={() => handlePrefetch(item.href)}
                          className="flex items-center gap-3 w-full group-data-[collapsible=icon]:gap-0"
                        >
                          <item.icon className="size-5! shrink-0" strokeWidth={2.5} />
                          <span className="font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>

      {!isMobile && (
        <button
          type="button"
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
