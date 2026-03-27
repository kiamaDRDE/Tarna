import { Skeleton } from "@/src/components/ui/skeleton";

const UserDashLoading = () => {
  return (
    <div className="w-full px-4 lg:px-6 py-6 space-y-4">
      {/* Header */}
      <Skeleton className="h-8 w-56" />
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg border">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-8" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="size-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashLoading;
