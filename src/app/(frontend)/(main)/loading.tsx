import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col">
      <div className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
        <Skeleton className="h-5 w-6" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <div className="px-4 sm:px-6 py-5">
        <Skeleton className="mb-1.5 h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3 px-4 sm:px-6">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
