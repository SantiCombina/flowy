import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SalesLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-5">
        <div>
          <Skeleton className="mb-1 h-8 w-20" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-full max-w-xs rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
                {[120, 80, 100, 80, 80, 60].map((w, i) => (
                  <Skeleton key={i} className="h-3.5" style={{ width: w }} />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b px-4 py-3.5">
                  {[120, 80, 100, 80, 80, 60].map((w, j) => (
                    <Skeleton key={j} className="h-3.5" style={{ width: w }} />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
