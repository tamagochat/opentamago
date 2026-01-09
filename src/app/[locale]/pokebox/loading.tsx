import { Skeleton } from "~/components/ui/skeleton";

export default function PokeboxLoading() {
  return (
    <div className="container max-w-7xl py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>

      {/* Two Panel Layout Skeleton */}
      <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Left Panel - Character List */}
        <div className="w-80 flex-shrink-0 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}
