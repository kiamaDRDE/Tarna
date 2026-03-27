import { Skeleton } from "@/src/components/ui/skeleton";
import { Card } from "@/src/components/ui/card";

const OrgLoading = () => {
  return (
    <div className="xl:max-w-2xl xl:w-2xl pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:p-0">
      {/* Header Card */}
      <Card className="flex flex-col gap-0 p-0 overflow-hidden mb-2">
        {/* Cover banner */}
        <Skeleton className="w-full h-32 rounded-none" />
        {/* Org info */}
        <div className="px-4 py-3">
          <div className="flex flex-row items-end gap-3">
            <Skeleton className="size-16 rounded-full border-3 border-background shrink-0 -mt-8" />
            <div className="space-y-1.5 pb-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          </div>
          {/* Bio + badges */}
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </Card>

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

export default OrgLoading;
