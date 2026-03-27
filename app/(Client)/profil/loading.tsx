import { Skeleton } from "@/src/components/ui/skeleton";

const ProfilLoading = () => {
  return (
    <div className="xl:max-w-2xl xl:w-2xl w-full pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0">
      {/* Cover */}
      <Skeleton className="h-52 md:h-64 w-full rounded-2xl" />

      {/* Profile card */}
      <div className="relative -mt-14 md:-mt-16 mx-3 md:mx-4 rounded-xl border bg-card p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          {/* Avatar */}
          <Skeleton className="size-24 md:size-28 rounded-full -mt-16 md:-mt-20 shrink-0 border-4 border-background" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-44" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3.5 w-64" />
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Post skeletons */}
      <div className="flex flex-col gap-4 mt-6 px-3 md:px-4">
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

export default ProfilLoading;
