'use client';

import { Check } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface FilterItem {
  key: string;
  label: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

interface FilterSheetProps {
  trigger: React.ReactNode;
  items: FilterItem[];
  title: string;
  align?: 'start' | 'end';
}

export function FilterSheet({ trigger, items, title, align = 'end' }: FilterSheetProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="rounded-t-xl p-0 gap-0" showCloseButton={false}>
            <SheetTitle className="sr-only">{title}</SheetTitle>
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted" />
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
            </div>
            <div className="pb-8">
              {items.map((item) => (
                <Button
                  key={item.key}
                  variant="ghost"
                  onClick={() => item.onToggle(!item.checked)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left text-base transition-colors active:bg-muted h-auto justify-start rounded-none"
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                    )}
                  >
                    {item.checked && <Check className="h-3 w-3" />}
                  </div>
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item) => (
          <DropdownMenuCheckboxItem key={item.key} checked={item.checked} onCheckedChange={item.onToggle}>
            {item.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
