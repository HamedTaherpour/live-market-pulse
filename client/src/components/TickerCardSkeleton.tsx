export function TickerCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-800" />
        <div className="h-4 w-12 animate-pulse rounded bg-gray-800" />
      </div>
      <div className="mt-4 h-8 w-32 animate-pulse rounded bg-gray-800" />
      <div className="mt-4 flex gap-3">
        <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-800" />
      </div>
      <div className="mt-1 h-3 w-16 animate-pulse rounded bg-gray-800" />
    </div>
  );
}
