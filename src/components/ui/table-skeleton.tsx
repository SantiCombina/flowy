import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  hasActions?: boolean;
  hasCheckbox?: boolean;
  firstColumnVariant?: 'checkbox' | 'status-dot';
  actionCount?: number;
  containerClassName?: string;
}

export function TableSkeleton({
  columns,
  rows = 5,
  hasActions = false,
  hasCheckbox = false,
  firstColumnVariant,
  actionCount = 1,
  containerClassName,
}: TableSkeletonProps) {
  const totalColumns = columns;

  return (
    <div className={cn('space-y-3', containerClassName)}>
      <div className="rounded-xl bg-card shadow-md overflow-hidden border border-border/20">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: totalColumns }).map((_, i) => {
                const isFirst = i === 0;
                const isAction = hasActions && i === totalColumns - 1;

                if (isAction) {
                  return (
                    <TableHead key={i} className="w-[60px]">
                      <Skeleton className="h-4 w-8 ml-auto" />
                    </TableHead>
                  );
                }

                if (isFirst && hasCheckbox) {
                  return (
                    <TableHead key={i} className="w-[40px]">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                  );
                }

                if (isFirst && firstColumnVariant === 'status-dot') {
                  return (
                    <TableHead key={i} className="w-[40px]">
                      <Skeleton className="h-2 w-2" />
                    </TableHead>
                  );
                }

                return (
                  <TableHead key={i}>
                    <Skeleton className={cn('h-4', i % 2 === 0 ? 'w-24' : 'w-20')} />
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: totalColumns }).map((_, colIndex) => {
                  const isFirst = colIndex === 0;
                  const isAction = hasActions && colIndex === totalColumns - 1;

                  if (isAction) {
                    return (
                      <TableCell key={colIndex}>
                        <div className="flex items-center gap-1 justify-end">
                          {Array.from({ length: actionCount }).map((_, aIdx) => (
                            <Skeleton key={aIdx} className="h-7 w-7 rounded-md" />
                          ))}
                        </div>
                      </TableCell>
                    );
                  }

                  if (isFirst && hasCheckbox) {
                    return (
                      <TableCell key={colIndex}>
                        <Skeleton className="h-4 w-4 rounded-sm" />
                      </TableCell>
                    );
                  }

                  if (isFirst && firstColumnVariant === 'status-dot') {
                    return (
                      <TableCell key={colIndex}>
                        <Skeleton className="h-2 w-2 rounded-full" />
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
