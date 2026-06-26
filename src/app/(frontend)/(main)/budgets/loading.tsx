export default function BudgetsLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b px-6 py-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex-1 space-y-4 px-4 pb-6 sm:px-6 pt-6">
        <div className="rounded-xl bg-card shadow-md overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-6 py-4 last:border-0">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
