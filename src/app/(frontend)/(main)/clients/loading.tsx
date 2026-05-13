import { Skeleton } from '@/components/ui/skeleton';

export default function ClientsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      {/* PageHeader skeleton */}
      <div className="relative bg-background px-4 sm:px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Skeleton className="h-8 w-28 sm:h-9" />
            <Skeleton className="mt-1.5 h-4 w-64" />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Skeleton className="hidden sm:block h-9 w-44 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        {/* Controls skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-card shadow-md overflow-hidden border border-border/20">
            {/* Table header skeleton */}
            <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="ml-auto h-4 w-16" />
            </div>

            {/* Table rows skeleton */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b px-4 py-3.5">
                <div className="flex items-center gap-3 w-32">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <div className="ml-auto flex items-center gap-1">
                  <Skeleton className="h-7 w-7 rounded-md" />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
