import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SellersLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
        <div>
          <Skeleton className="mb-1 h-6 w-24" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 pt-5 sm:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-full max-w-sm rounded-md" />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-14" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
                {[160, 120, 100, 80].map((w, i) => (
                  <Skeleton key={i} className="h-3.5" style={{ width: w }} />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b px-4 py-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
