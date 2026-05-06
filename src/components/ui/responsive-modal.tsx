'use client';

import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const ResponsiveModalContext = React.createContext<{ isMobile: boolean }>({ isMobile: false });

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
      <ResponsiveModalContext.Provider value={{ isMobile: true }}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className={cn('flex flex-col gap-0 p-0', className)}>
            <DrawerTitle className="sr-only">Modal</DrawerTitle>
            {children}
          </DrawerContent>
        </Drawer>
      </ResponsiveModalContext.Provider>
    );
  }

  return (
    <ResponsiveModalContext.Provider value={{ isMobile: false }}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn('flex flex-col gap-0 p-0 overflow-hidden', className)}>{children}</DialogContent>
      </Dialog>
    </ResponsiveModalContext.Provider>
  );
}

export function ResponsiveModalHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-6 pb-2', className)} {...props} />;
}

export function ResponsiveModalTitle({ className, children, ...props }: React.ComponentProps<typeof DialogTitle>) {
  const { isMobile } = React.useContext(ResponsiveModalContext);
  if (isMobile) {
    return (
      <DrawerTitle className={cn('text-lg font-semibold leading-none', className)} {...props}>
        {children}
      </DrawerTitle>
    );
  }
  return (
    <DialogTitle className={cn('text-lg font-semibold leading-none', className)} {...props}>
      {children}
    </DialogTitle>
  );
}

export function ResponsiveModalDescription({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isMobile } = React.useContext(ResponsiveModalContext);
  if (isMobile) {
    return (
      <DrawerDescription className={cn('text-sm text-muted-foreground', className)} {...props}>
        {children}
      </DrawerDescription>
    );
  }
  return (
    <DialogDescription className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </DialogDescription>
  );
}

export function ResponsiveModalBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-x-hidden overflow-y-auto px-6 py-4', className)} {...props} />;
}

export function ResponsiveModalFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-row justify-end gap-2 border-t p-6 pt-4', className)} {...props} />;
}
