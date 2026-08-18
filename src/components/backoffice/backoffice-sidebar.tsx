'use client';

import { Building2, CreditCard, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const backofficeNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/backoffice/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Tenants',
    href: '/backoffice/tenants',
    icon: Building2,
  },
  {
    title: 'Planes',
    href: '/backoffice/plans',
    icon: CreditCard,
  },
];

export function BackofficeSidebar() {
  const pathname = usePathname();

  const getIsActive = (item: NavItem): boolean => {
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <Sidebar collapsible="icon">
      <div className="relative h-full w-full flex flex-col">
        <SidebarHeader className="absolute top-0 left-0 right-0 z-10 px-3 py-6">
          <Link
            href="/backoffice/dashboard"
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
            <div className="-ml-1.5 flex min-w-0 flex-col overflow-hidden transition-all duration-300 ease-in-out group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">
              <span
                className="text-sm font-bold tracking-tight text-sidebar-foreground whitespace-nowrap"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Flowy
              </span>
              <span className="truncate text-xs text-sidebar-foreground/55 whitespace-nowrap">Panel backoffice</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarGroup className="p-0 w-full my-auto">
            <SidebarGroupContent>
              <nav aria-label="Navegación backoffice">
                <SidebarMenu className="gap-1.5">
                  {backofficeNavItems.map((item) => (
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
    </Sidebar>
  );
}
