import { ResponsiveModalBody } from '@/components/ui/responsive-modal';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductFormSkeleton() {
  return (
    <ResponsiveModalBody className="space-y-5">
      <div className="space-y-4">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-3.5 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </ResponsiveModalBody>
  );
}
