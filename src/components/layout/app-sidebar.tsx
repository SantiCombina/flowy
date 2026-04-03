'use client';

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

import { useUserOptional } from '@/components/providers/user-provider';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import type { FeatureFlags } from '@/lib/features';

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
  const { isMobile, setOpenMobile } = useSidebar();
  const user = useUserOptional();

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
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
      <SidebarHeader className="h-14 p-2 transition-all duration-300 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <Link
          href="/"
          className="flex h-full w-full items-center gap-2 rounded-md p-2 transition-all duration-300 hover:bg-sidebar-accent group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:bg-transparent"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Box className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex min-w-0 flex-col overflow-hidden transition-all duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <span className="text-sm font-bold text-sidebar-foreground whitespace-nowrap">Flowy</span>
            <span className="text-xs text-sidebar-foreground/60 whitespace-nowrap">
              {user?.businessName?.trim() || 'Mi negocio'}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Navegación principal">
              <SidebarMenu className="gap-0.5">
                {filteredMainNav.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={getIsActive(item)}
                      tooltip={item.title}
                      size="lg"
                      className="data-[active=true]:shadow-[inset_3px_0_0_var(--primary)] group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:justify-center"
                    >
                      <Link href={item.href} onClick={handleNavClick}>
                        <item.icon className="h-4.5 w-4.5" />
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

      <SidebarRail />
    </Sidebar>
  );
}
