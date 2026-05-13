import { Skeleton } from '@/components/ui/skeleton';

export function ClientsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-5">
        <div>
          <Skeleton className="mb-1 h-8 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="hidden sm:block h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-9 w-full sm:max-w-sm rounded-md" />
          <Skeleton className="ml-auto h-9 w-9 rounded-md" />
        </div>

        <div className="rounded-xl bg-card shadow-md overflow-hidden">
          <div className="border-b">
            <div className="flex gap-4 px-4 py-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
