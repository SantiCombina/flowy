'use client';

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: '!rounded-2xl !border !border-border/50 !shadow-lg !ring-0 !pl-5',
          icon: '!ml-0',
          success: '!bg-[color-mix(in_oklch,var(--success-muted)_40%,var(--popover))] !text-[var(--success)]',
          error: '!bg-[color-mix(in_oklch,var(--error-muted)_40%,var(--popover))] !text-[var(--error)]',
          warning: '!bg-[color-mix(in_oklch,var(--warning-muted)_40%,var(--popover))] !text-[var(--warning)]',
          info: '!bg-[color-mix(in_oklch,var(--info-muted)_40%,var(--popover))] !text-[var(--info)]',
          closeButton:
            '!left-auto !right-0 !top-0 !size-5 !rounded-full !bg-white/60 dark:!bg-black/40 !backdrop-blur-md !text-current !border-0 !ring-0 hover:!bg-white/80 dark:hover:!bg-black/60 !transition-colors !translate-none',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
