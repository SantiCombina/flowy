import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
            <Card key={i} className="flex flex-col overflow-hidden shadow-sm relative p-0">
              <Skeleton className="h-1.5 w-full" />

              <CardHeader className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Skeleton className="h-3.5 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 px-5 pt-0 pb-5">
                <div className="rounded-lg bg-muted/30 divide-y divide-border/60 overflow-hidden shadow-sm space-y-0">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-5 w-10 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
