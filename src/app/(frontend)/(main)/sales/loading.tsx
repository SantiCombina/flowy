import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function SalesLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="relative bg-background px-4 sm:px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Skeleton className="h-8 w-24 sm:h-9" />
            <Skeleton className="mt-1.5 h-4 w-72" />
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-4 px-4 pb-6 sm:px-6">
        <TableSkeleton columns={9} rows={8} hasActions actionCount={2} />
      </main>
    </div>
  );
}
