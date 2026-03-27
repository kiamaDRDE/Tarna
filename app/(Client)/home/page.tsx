import AddPostCard from "@/src/components/personnal/addPostCard";
import NewFeed from "@/src/components/personnal/newFeed";
import { Button } from "@/src/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/src/components/ui/empty";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Image as ImageIcon, RefreshCcwIcon } from "lucide-react";
import { fetchInitialPosts } from "./actions";
import { Suspense } from "react";

export function EmptyMuted() {
  return (
    <Empty className="bg-muted/30 h-full py-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ImageIcon />
        </EmptyMedia>
        <EmptyTitle>Aucune publication</EmptyTitle>
        <EmptyDescription className="max-w-xs text-pretty">
          Vous êtes à jour. Les nouvelles publications apparaîtront ici.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">
          <RefreshCcwIcon />
          Rafraîchir
        </Button>
      </EmptyContent>
    </Empty>
  );
}
async function PostsSection() {
  const data = await fetchInitialPosts();

  return (
    <>
      <NewFeed
        firstPost={data.posts}
        initialCursor={data.nextCursor}
        initialHasMore={data.hasMore}
      />
    </>
  );
}

const HomePage = async () => {
  return (
    <div className="xl:max-w-2xl xl:w-2xl w-full pb-20 h-full overflow-scroll hide-scrollbar md:px-10 xl:px-0">
      <AddPostCard isgroup={false} />

      <Suspense
        fallback={
          <div className="flex flex-col gap-4 pt-2 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Author row */}
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                {/* Content lines */}
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
                {/* Image placeholder (every other) */}
                {i % 2 === 0 && <Skeleton className="h-48 w-full rounded-lg" />}
                {/* Action bar */}
                <div className="flex items-center gap-6 pt-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <PostsSection />
      </Suspense>
    </div>
  );
};

export default HomePage;
