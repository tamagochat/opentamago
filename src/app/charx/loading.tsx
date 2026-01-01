import { FileArchive } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";

export default function CharXLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between sm:h-16">
          <div className="flex items-center gap-4 sm:gap-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24 hidden sm:block" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileArchive className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        {/* Upload area skeleton */}
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/25 p-8 sm:p-12">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <div className="space-y-2 text-center">
              <Skeleton className="h-5 w-48 mx-auto" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
