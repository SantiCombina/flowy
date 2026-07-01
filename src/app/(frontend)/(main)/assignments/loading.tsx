import { Skeleton } from '@/components/ui/skeleton';

export default function AssignmentsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative bg-background px-4 sm:px-6 py-5">
        <div>
          <Skeleton className="h-8 w-36 sm:h-9" />
          <Skeleton className="mt-1.5 h-4 w-64" />
        </div>
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-44 animate-pulse rounded-full bg-muted" />
          <Skeleton className="h-6 w-48 animate-pulse rounded-full bg-muted" />
        </div>

        <Skeleton className="h-9 w-full max-w-sm animate-pulse rounded-md bg-muted" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </main>
    </div>
  );
}
