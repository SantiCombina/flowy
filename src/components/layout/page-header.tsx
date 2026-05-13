'use client';

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  isLoading?: boolean;
  hideTitle?: boolean;
}

export function PageHeader({ title, description, actions, isLoading, hideTitle }: PageHeaderProps) {
  if (hideTitle) return null;

  return (
    <div className="relative bg-background px-4 sm:px-6 py-5">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[loading_1.2s_ease-in-out_infinite] bg-primary" />
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && (
          <div className="shrink-0 self-end sm:self-auto pt-1 [&_[data-slot=button][data-variant=default]]:shadow-md [&_[data-slot=button][data-variant=default]]:shadow-primary/20 [&_[data-slot=button][data-variant=default]]:hover:brightness-110">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
