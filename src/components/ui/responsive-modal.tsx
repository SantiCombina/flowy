'use client';

import * as React from 'react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Sheet, SheetContent, SheetTitle } from './sheet';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModal({ open, onOpenChange, children, className }: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex flex-col gap-0 p-0 rounded-t-xl max-h-[90svh]">
          <SheetTitle className="sr-only">Modal</SheetTitle>
          {children}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('flex flex-col gap-0 p-0 overflow-hidden', className)}>{children}</DialogContent>
    </Dialog>
  );
}

export function ResponsiveModalHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-6 pb-2', className)} {...props} />;
}

export function ResponsiveModalTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle className={cn('text-lg font-semibold leading-none', className)} {...props} />;
}

export function ResponsiveModalDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription>) {
  return <DialogDescription className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function ResponsiveModalBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-x-hidden overflow-y-auto px-6 py-4', className)} {...props} />;
}

export function ResponsiveModalFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-row justify-end gap-2 border-t p-6 pt-4', className)} {...props} />;
}
