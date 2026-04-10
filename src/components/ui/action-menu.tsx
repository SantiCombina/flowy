'use client';

import { MoreVertical } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl p-0">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />
          <div className="py-2 pb-6">
            {filtered.map((item, index) => (
              <React.Fragment key={item.label}>
                {item.separator && index > 0 && <div className="my-1 h-px bg-border" />}
                <button
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full items-center gap-4 px-6 py-4 text-left text-base transition-colors active:bg-muted',
                    item.variant === 'destructive' && 'text-destructive',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </SheetContent>
      </Sheet>
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
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
