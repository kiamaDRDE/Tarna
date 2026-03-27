import { Skeleton } from "@/src/components/ui/skeleton";

const GroupLoading = () => {
  return (
    <div className="xl:max-w-2xl xl:w-2xl pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:p-0">
      {/* Group Header */}
      <div className="rounded-2xl border bg-card mb-2 mt-1 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Group identity */}
        <div className="flex items-center gap-3.5 px-4 pb-3">
          <Skeleton className="size-14 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-40" />
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>

        {/* Description + badge */}
        <div className="px-4 pb-3 border-t pt-2.5 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-4 w-24 rounded-full mt-1" />
        </div>
      </div>

      {/* Post skeletons */}
      <div className="flex flex-col gap-4 mt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
            {i === 0 && <Skeleton className="h-44 w-full rounded-lg" />}
            <div className="flex items-center gap-6 pt-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupLoading;
