import { Skeleton } from '@/components/ui/skeleton';

export default function ProductsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative bg-background px-4 sm:px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Skeleton className="h-8 w-40 sm:h-9" />
            <Skeleton className="mt-1.5 h-4 w-64" />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Skeleton className="hidden sm:block h-9 w-44 rounded-full" />
            <Skeleton className="h-9 w-36 rounded-md" />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
          <div className="ml-auto">
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>

          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b px-4 py-3.5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Skeleton className="h-9 w-9 rounded-md shrink-0" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <div className="ml-auto flex items-center gap-1">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
