import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/50 dark:aria-invalid:ring-destructive/40 aria-invalid:ring-[3px] dark:bg-input/30 flex min-h-16 w-full rounded-md bg-white px-3 py-2 text-base shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
