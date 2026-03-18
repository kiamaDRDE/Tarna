"use client";
import { Button } from "../ui/button";
import { Clock9, Sparkles } from "lucide-react";
import { Spinner } from "../ui/spinner";
import FeedItem from "./ui/feedItem";
import { useUserStore } from "@/src/store/userStore";
import { useSocketEvent } from "@/src/hooks/useSocketEvent";
import { mapRawPost } from "@/src/lib/mapPost";
import { fetchMorePosts } from "@/app/(Client)/home/actions";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Post } from "@/src/types/post";
import { useOrgPostStore } from "@/src/store/orgPostStore";
import { useSocket } from "@/src/components/providers/socketProvider";
import { toast } from "sonner";

type FeedFilter = "for-you" | "recent";

type RoomType = "org" | "group";

type NewFeedProps = {
  firstPost: Post[];
  initialCursor: string | null;
  initialHasMore: boolean;
  roomType: RoomType;
  roomId: string;
  roomName: string;
};

const NewOrgFeed = ({
  firstPost,
  initialCursor,
  initialHasMore,
  roomType,
  roomId,
  roomName,
}: NewFeedProps) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<FeedFilter>("for-you");
  const [now, setNow] = useState(() => Date.now());
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ── Buffer de nouveaux posts reçus via WS ──
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const socket = useSocket();

  // ── Rejoindre la room scope:<id> au montage ──
  useEffect(() => {
    if (!socket) return;
    socket.emit(`${roomType}:subscribe`, [roomId]);
  }, [socket, roomType, roomId]);

  // ── Feed store ──
  const feedPosts = useOrgPostStore((s) => s.posts);
  const setPosts = useOrgPostStore((s) => s.setPosts);
  const addpost = useOrgPostStore((s) => s.addPost);
  const appendPosts = useOrgPostStore((s) => s.appendPosts);
  const hasMore = useOrgPostStore((s) => s.hasMore);

  // ── Écouter <scope>:post:new — accumuler les posts reçus ──
  const handleNewScopedPost = useCallback((raw: unknown) => {
    const post = mapRawPost(raw);
    setPendingPosts((prev) => {
      if (prev.some((p) => p.id === post.id)) return prev;
      return [post, ...prev];
    });
  }, []);

  useSocketEvent(`${roomType}:post:new`, handleNewScopedPost);

  // ── Toast quand de nouveaux posts arrivent ──
  useEffect(() => {
    if (pendingPosts.length === 0) return;
    const count = pendingPosts.length;
    toast(
      `${count} nouveau${count > 1 ? "x" : ""} post${count > 1 ? "s" : ""}`,
      {
        id: "org-new-posts",
        action: {
          label: "Actualiser",
          onClick: () => {
            for (const p of pendingPosts) {
              addpost(p);
            }
            setPendingPosts([]);
          },
        },
        duration: Infinity,
      },
    );
  }, [pendingPosts, addpost]);

  // ── Hydratation initiale — posts SSR + cursor/hasMore du serveur ──
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current && firstPost.length > 0) {
      setPosts(firstPost, initialCursor, initialHasMore);
      hydrated.current = true;
    }
    if (!hydrated.current && firstPost.length === 0) {
      // Même s'il n'y a pas de post, on doit quand même hydrater le store avec le cursor + hasMore
      setPosts([], initialCursor, initialHasMore);
      hydrated.current = true;
    }
  }, [firstPost, initialCursor, initialHasMore, setPosts]);

  // ── Charger la page suivante — appel direct server action ──
  const loadingRef = useRef(false);
  const handleLoadMore = async () => {
    // Lire les stores directement pour avoir les valeurs fraîches
    const { hasMore: canLoad, nextCursor: cursor } = useOrgPostStore.getState();
    const token = useUserStore.getState().accessToken;
    if (loadingRef.current || !canLoad || !cursor) return;

    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const result = await fetchMorePosts(cursor, token, {
        orgId: roomType === "org" ? roomId : undefined,
        groupId: roomType === "group" ? roomId : undefined,
      });

      if (result.posts.length > 0) {
        appendPosts(result.posts, result.nextCursor, result.hasMore);
      } else {
        useOrgPostStore.setState({ hasMore: false, nextCursor: null });
      }
    } catch {
      useOrgPostStore.setState({ hasMore: false, nextCursor: null });
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  // ── Infinite scroll via IntersectionObserver ──
  const handleLoadMoreRef = useRef(handleLoadMore);
  handleLoadMoreRef.current = handleLoadMore;

  const postsReady = feedPosts.length > 0;
  useEffect(() => {
    if (!postsReady || filter !== "for-you") return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMoreRef.current();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [postsReady, filter]);

  // Filtre appliqué sur les posts du store
  const posts = useMemo(() => {
    if (filter === "recent") {
      return feedPosts
        .filter((post) => {
          const diffMs = now - new Date(post.createdAt).getTime();
          return diffMs <= 24 * 60 * 60 * 1000;
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
    return feedPosts;
  }, [filter, feedPosts, now]);

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Filtres ─── */}
      <div className="flex flex-row gap-2">
        <Button
          variant={filter === "for-you" ? "default" : "outline"}
          size="sm"
          className={`cursor-pointer gap-1.5 rounded-full text-black dark:text-white ${filter === "for-you" ? "bg-primary/20 hover:bg-primary/30" : "bg-transparent hover:bg-primary/10"}`}
          onClick={() => setFilter("for-you")}
        >
          <Sparkles className="size-3.5" />
          Pour vous
        </Button>
        <Button
          variant={filter === "recent" ? "default" : "outline"}
          size="sm"
          className={`cursor-pointer gap-1.5 rounded-full text-black dark:text-white ${filter === "recent" ? "bg-primary/20 hover:bg-primary/30" : "bg-transparent hover:bg-primary/10"}`}
          onClick={() => {
            setFilter("recent");
            setNow(Date.now());
          }}
        >
          <Clock9 className="size-3.5" />
          Récents
        </Button>
      </div>

      {/* ─── Contenu ─── */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
          <Clock9 className="size-10 opacity-30" />
          <p className="text-sm">
            {filter === "recent"
              ? "Aucun post dans les dernières 24h."
              : "Aucun post pour le moment."}
          </p>
          {filter === "recent" && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer mt-1"
              onClick={() => setFilter("for-you")}
            >
              Voir tous les posts
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <FeedItem key={post.id} post={post} isgroup groupName={roomName} />
          ))}

          {/* Sentinelle infinite scroll + spinner + fallback bouton */}
          {filter === "for-you" && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {isLoadingMore && <Spinner className="size-5" />}
              {hasMore && !isLoadingMore && (
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-2"
                  onClick={() => handleLoadMoreRef.current()}
                  disabled={isLoadingMore}
                >
                  Charger plus
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewOrgFeed;
