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
          <Skeleton className="h-6 w-44 rounded-full" />
          <Skeleton className="h-6 w-48 rounded-full" />
        </div>

        <Skeleton className="h-9 w-full max-w-sm rounded-md" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-card p-4 shadow-sm space-y-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>

              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between py-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3.5 w-12" />
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t">
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
