'use client';

import { MoreVertical } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface ActionItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

interface ActionMenuProps {
  items: (ActionItem | false | null | undefined)[];
}

export function ActionMenu({ items }: ActionMenuProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const filtered = items.filter((item): item is ActionItem => Boolean(item));

  const handleSelect = (item: ActionItem) => {
    setOpen(false);
    item.onClick();
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <MoreVertical className="h-4 w-4" />
        </Button>
        <DrawerContent className="p-0 gap-0">
          <DrawerTitle className="sr-only">Acciones</DrawerTitle>
          <div className="py-2 pb-6">
            {filtered.map((item, index) => (
              <React.Fragment key={item.label}>
                {item.separator && index > 0 && <div className="my-1 h-px bg-border" />}
                <Button
                  variant="ghost"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full items-center justify-start gap-3 px-4! py-3.5 text-left text-base h-auto rounded-md',
                    item.variant === 'destructive'
                      ? 'text-destructive hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10'
                      : '',
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', item.variant === 'destructive' && 'text-destructive')} />
                  {item.label}
                </Button>
              </React.Fragment>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {filtered.map((item, index) => (
          <React.Fragment key={item.label}>
            {item.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={item.onClick}
              className={cn(
                item.variant === 'destructive' && 'text-destructive focus:bg-destructive/10 focus:text-destructive',
              )}
            >
              <item.icon className={cn('mr-2 h-4 w-4', item.variant === 'destructive' && 'text-destructive')} />
              {item.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
