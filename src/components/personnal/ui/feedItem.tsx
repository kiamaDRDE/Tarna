"use client";
import {
  BadgeCheck,
  ChevronDown,
  Ellipsis,
  FileText,
  Heart,
  Loader2,
  MessageCircle,
  Pin,
  Send,
  Trash,
  ArrowDownToLine,
  X,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "../../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {  FileDocument, Post } from "@/src/types/post";
import Image from "next/image";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import CommentItem from "./commentItem";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { useUserStore } from "@/src/store/userStore";
import { Comment } from "@/src/types/post";
import {
  deletePost,
  fetchComments,
  createComment,
  reactToPost,
  deleteReactionToPost,
} from "@/src/lib/api";
import { useFeedStore } from "@/src/store/feedStore";
import { useOrgPostStore } from "@/src/store/orgPostStore";
import { useCommentStore } from "@/src/store/commentStore";
import {
  mapRawComment,
  flattenRawComments,
  buildCommentTree,
} from "@/src/lib/mapComment";
import { Skeleton } from "../../ui/skeleton";
import { toast } from "sonner";
import { linkifyText } from "@/src/lib/LinklyText";
import Link from "next/link";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { getInitials } from "@/src/lib/getInitials";
import { Badge } from "../../ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "../../ui/carousel";

export type ReactionType = null | "like" | "illuminate" | "support";
type ReactionKind = Exclude<ReactionType, null>;

const FeedItem = ({
  post,
  isgroup,
}: {
  post: Post;
  isgroup?: boolean;
}) => {
  const [reaction, setReaction] = useState<ReactionType>(
    post.myReaction ?? null,
  );
  const [previewDoc, setPreviewDoc] = useState<FileDocument | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [reactionSyncing, setReactionSyncing] = useState(false);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const currentUser = useUserStore((state) => state.user);
  const accessToken = useUserStore((state) => state.accessToken);
  const removePostMain = useFeedStore((s) => s.removePost);
  const updatePostMain = useFeedStore((s) => s.updatePost);
  const removePostOrg = useOrgPostStore((s) => s.removePost);
  const updatePostOrg = useOrgPostStore((s) => s.updatePost);
  const removePost = isgroup ? removePostOrg : removePostMain;
  const updatePost = isgroup ? updatePostOrg : updatePostMain;
  const reactionRef = useRef<ReactionType>(post.myReaction ?? null);
  const confirmedReactionRef = useRef<ReactionType>(post.myReaction ?? null);
  const queuedReactionRef = useRef<ReactionType | undefined>(undefined);
  const reactionInFlightRef = useRef(false);
  const confirmedCountsRef = useRef<Record<ReactionKind, number>>({
    like: Number.isFinite(post.stats.likes_count)
      ? Number(post.stats.likes_count)
      : 0,
    illuminate: Number.isFinite(post.stats.illuminates_count)
      ? Number(post.stats.illuminates_count)
      : 0,
    support: Number.isFinite(post.stats.supports_count)
      ? Number(post.stats.supports_count)
      : 0,
  });

  // ── Comment store ──
  const EMPTY: Comment[] = useMemo(() => [], []);
  const flatComments =
    useCommentStore((s) => s.commentsByPost[post.id]) ?? EMPTY;
  const commentsLoading =
    useCommentStore((s) => s.loadingPosts[post.id]) ?? false;
  const setComments = useCommentStore((s) => s.setComments);
  const addComment = useCommentStore((s) => s.addComment);
  const setCommentsLoading = useCommentStore((s) => s.setLoading);

  // Arbre de commentaires (3 niveaux)
  const commentTree = useMemo(
    () => buildCommentTree(flatComments),
    [flatComments],
  );

  const isOwnPost = currentUser?.id === post.authorId;

  // ── Charger les commentaires à la première ouverture ──
  const hasFetchedComments = useRef(false);

  useEffect(() => {
    if (!commentsOpen || !accessToken || hasFetchedComments.current) return;

    hasFetchedComments.current = true;
    setCommentsLoading(post.id, true);

    fetchComments(post.id, accessToken)
      .then(async (res) => {
        if (!res.ok) return;
        const json = await res.json();
        const raw = Array.isArray(json)
          ? json
          : (json.data ?? json.comments ?? []);
        const mapped = flattenRawComments(raw);
        setComments(post.id, mapped);
      })
      .catch(() => {})
      .finally(() => {
        setCommentsLoading(post.id, false);
      });
  }, [commentsOpen, accessToken, post.id, setComments, setCommentsLoading]);

  // ── Envoyer un commentaire racine ──
  const handleSendComment = useCallback(async () => {
    if (!commentText.trim() || commentSending || !accessToken) return;
    setCommentSending(true);
    try {
      const res = await createComment(
        {
          postId: post.id,
          authorId: currentUser?.id || "",
          contentText: commentText.trim(),
        },
        accessToken,
      );
      if (res.ok) {
        const data = await res.json();
        const mapped = mapRawComment(data);
        addComment(post.id, mapped);
        setCommentText("");
      } else {
        toast.error("Échec de l'envoi du commentaire");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setCommentSending(false);
    }
  }, [
    commentText,
    commentSending,
    accessToken,
    post.id,
    addComment,
    currentUser?.id,
  ]);

  const handleDelete = useCallback(async () => {
    if (!isAuthenticated || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await deletePost(post.id, accessToken);
      if (res.ok) {
        removePost(post.id);
      }
    } catch {
      // silently fail
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(false);
    }
  }, [isAuthenticated, post.id, accessToken, deleteLoading, removePost]);

  useEffect(() => {
    reactionRef.current = reaction;
  }, [reaction]);

  const applyConfirmedCountsTransition = useCallback(
    (previousReaction: ReactionType, nextReaction: ReactionType) => {
      if (previousReaction === nextReaction) return;

      const counts = { ...confirmedCountsRef.current };
      if (previousReaction) {
        counts[previousReaction] = Math.max(0, counts[previousReaction] - 1);
      }
      if (nextReaction) {
        counts[nextReaction] = counts[nextReaction] + 1;
      }
      confirmedCountsRef.current = counts;
    },
    [],
  );

  const flushReactionQueue = useCallback(async () => {
    if (reactionInFlightRef.current || !accessToken) return;

    const next = queuedReactionRef.current;
    if (next === undefined) return;

    if (next === confirmedReactionRef.current) {
      queuedReactionRef.current = undefined;
      return;
    }

    queuedReactionRef.current = undefined;
    reactionInFlightRef.current = true;
    setReactionSyncing(true);

    try {
      const res =
        next === null
          ? await deleteReactionToPost(post.id, accessToken)
          : await reactToPost(post.id, next, accessToken);

      if (res.ok) {
        const previousConfirmed = confirmedReactionRef.current;
        confirmedReactionRef.current = next;
        applyConfirmedCountsTransition(previousConfirmed, next);
        updatePost(post.id, {
          myReaction: next,
          stats: {
            ...post.stats,
            likes_count: confirmedCountsRef.current.like,
            illuminates_count: confirmedCountsRef.current.illuminate,
            supports_count: confirmedCountsRef.current.support,
            reactions_count:
              confirmedCountsRef.current.like +
              confirmedCountsRef.current.illuminate +
              confirmedCountsRef.current.support,
          },
        });
      } else if (queuedReactionRef.current === undefined) {
        setReaction(confirmedReactionRef.current);
      }
    } catch {
      if (queuedReactionRef.current === undefined) {
        setReaction(confirmedReactionRef.current);
      }
    } finally {
      reactionInFlightRef.current = false;
      setReactionSyncing(false);

      if (
        queuedReactionRef.current !== undefined &&
        queuedReactionRef.current !== confirmedReactionRef.current
      ) {
        void flushReactionQueue();
      }
    }
  }, [
    accessToken,
    post.id,
    post.stats,
    updatePost,
    applyConfirmedCountsTransition,
  ]);

  const toggleReaction = useCallback(
    (type: Exclude<ReactionType, null>) => {
      if (!isAuthenticated || !accessToken) return;

      const next: ReactionType = reactionRef.current === type ? null : type;
      reactionRef.current = next;
      setReaction(next);
      updatePost(post.id, { myReaction: next });
      queuedReactionRef.current = next;

      void flushReactionQueue();
    },
    [isAuthenticated, accessToken, post.id, updatePost, flushReactionQueue],
  );

  const handleDownloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.target = "_blank";
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  function computeReactionCount(
    type: ReactionKind,
    confirmedReaction: ReactionType,
    optimisticReaction: ReactionType,
  ) {
    const safeCount = confirmedCountsRef.current[type];
    const removeDelta = confirmedReaction === type ? -1 : 0;
    const addDelta = optimisticReaction === type ? 1 : 0;
    return Math.max(0, safeCount + removeDelta + addDelta);
  }
  const isOrgPost = Boolean(post.orgId || post.organization?.id);
  const isGroupPost = Boolean(post.groupId);
  const orgDisplayName = post.organization?.name || "Organisation";
  const orgInitials = getInitials(orgDisplayName);
  

  return (
    <Collapsible asChild open={commentsOpen} onOpenChange={setCommentsOpen}>
      <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* ─── Header ─── */}
        <CardHeader className="flex flex-row items-start justify-between pb-2">
         <Link href={isOrgPost ? `/organizations/${post.organization?.id}` : isGroupPost ? `/groups/${post.groupId}` : `/profil/${post.author.username}`}>
          <div className="flex flex-row items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage
                src={isOrgPost ? post.organization?.logoUrl ?? "" : post.author.avatar}
                alt={isOrgPost ? orgDisplayName : post.author.name}
              />
              <AvatarFallback
                className={`text-xs font-semibold ${getAvatarFallbackColor(
                  isOrgPost ? orgInitials : getInitials(post.author.name),
                )}`}
              >
                {isOrgPost ? orgInitials : getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex flex-row items-center gap-1.5">
                <p className="text-sm font-semibold">
                  {isOrgPost ? orgDisplayName : post.author.name}
                </p>
                {post.author.isVerified && (
                  <BadgeCheck className="size-3.5 text-primary" />
                )}
                {post.isPinned && (
                  <Pin className="size-3 text-muted-foreground" />
                )}
                {!isgroup && isOrgPost && (
                  <Badge
                    variant={"outline"}
                    className="text-[9px] bg-primary/10 text-primary"
                  >
                    {"Organisation"}
                  </Badge>
                )}
                {!isgroup && isGroupPost && (
                  <Badge
                    variant={"outline"}
                    className="text-[9px] bg-primary/10 text-primary"
                  >
                    {"Groupe"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                @{isgroup ? post.author.username : isOrgPost ? orgDisplayName : post.author.username} · {post.timeAgo}
              </p>
            </div>

            {/* Bouton Follow — directement après les infos auteur */}
            {/* {isAuthenticated && !isOwnPost && post.authorId && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                className="h-7 px-3 rounded-full text-xs gap-1.5 cursor-pointer ml-1"
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : isFollowing ? (
                  <UserCheck className="size-3.5" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                {isFollowing ? "Suivi" : "Suivre"}
              </Button>
            )} */}
          </div>
         </Link>

          <DropdownMenu>
            {isOwnPost && (
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <Ellipsis className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
            )}
            <DropdownMenuContent className="w-44" align="end">
              {/* <DropdownMenuGroup>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link href={`/profil/${post.author.username}`}>
                    <User className="size-4" /> Voir le profil
                  </Link>
                </DropdownMenuItem> */}
              {/* {isOwnPost ? (
                  <DropdownMenuItem className="cursor-pointer gap-2">
                    <Pin className="size-4" />{" "}
                    {post.isPinned ? "Détacher" : "Épingler"}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2"
                    onClick={handleFollow}
                  >
                    {isFollowing ? (
                      <UserCheck className="size-4" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    {isFollowing ? "Ne plus suivre" : "Suivre"}
                  </DropdownMenuItem>
                )} */}
              {/* <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onClick={() => setSaved(!saved)}
                >
                  <Bookmark className="size-4" />
                  {saved ? "Retirer des favoris" : "Enregistrer"}
                </DropdownMenuItem> */}
              {/* </DropdownMenuGroup>
              <DropdownMenuSeparator /> */}
              <DropdownMenuGroup>
                {/* <DropdownMenuItem
                  onClick={() => {}}
                  className="cursor-pointer gap-2"
                >
                  <EyeOff className="size-4" /> Masquer
                </DropdownMenuItem> */}
                {isOwnPost && (
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash className="size-4" />
                    )}
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        {/* ─── Content ─── */}
        <CardContent className="pb-2 pt-0">
          {/* Texte */}
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {linkifyText(post.content)}
          </p>

          {/* Images */}
          {post.images?.length > 0 && (
            <>
              <div
                className={`mt-3 rounded-xl overflow-hidden border border-border/40 ${
                  post.images.length === 1
                    ? ""
                    : post.images.length === 2
                      ? "grid grid-cols-2 gap-0.5"
                      : post.images.length === 3
                        ? "grid grid-cols-3 grid-rows-2 gap-0.5"
                        : "grid grid-cols-2 grid-rows-2 gap-0.5"
                }`}
              >
                {post.images.slice(0, 4).map((media, index) => (
                  <div
                    key={index}
                    className={`relative overflow-hidden bg-muted cursor-pointer group ${
                      post.images.length === 1
                        ? "h-64 sm:h-72"
                        : post.images.length === 2
                          ? "h-44 sm:h-56"
                          : post.images.length === 3 && index === 0
                            ? "row-span-2 col-span-2 h-44 sm:h-56"
                            : post.images.length === 3
                              ? "h-[calc(11rem-1px)] sm:h-[calc(14rem-1px)]"
                              : "h-36 sm:h-44"
                    }`}
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                  >
                    <Image
                      src={media}
                      alt={`post image ${index + 1}`}
                      fill
                      sizes={
                        post.images.length === 1
                          ? "(max-width: 640px) 100vw, 500px"
                          : "(max-width: 640px) 50vw, 250px"
                      }
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-200"
                    />

                    {post.images.length > 4 && index === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                        <span className="text-white text-xl font-semibold">
                          +{post.images.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Image Lightbox Carousel */}
              <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="max-w-[95vw] sm:max-w-3xl h-[85vh] flex flex-col p-0 gap-0 bg-black/95 border-none [&>button]:hidden">
                  <DialogHeader className="absolute top-0 right-0 z-20 p-2">
                    <DialogTitle className="sr-only">
                      Aperçu des images
                    </DialogTitle>
                    <button
                      className="rounded-full bg-black/60 hover:bg-black/80 text-white p-1.5 transition-colors cursor-pointer"
                      onClick={() => setLightboxOpen(false)}
                    >
                      <X className="size-5" />
                    </button>
                  </DialogHeader>
                  <div className="flex-1 flex items-center justify-center min-h-0 px-2 sm:px-10">
                    <Carousel
                      opts={{ startIndex: lightboxIndex, loop: true }}
                      className="w-full h-full"
                    >
                      <CarouselContent className="h-full items-center ml-0">
                        {post.images.map((media, i) => (
                          <CarouselItem
                            key={i}
                            className="flex items-center justify-center h-full pl-0"
                          >
                            <div className="relative w-full h-[75vh]">
                              <Image
                                src={media}
                                alt={`image ${i + 1}`}
                                fill
                                sizes="95vw"
                                className="object-contain"
                                priority={i === lightboxIndex}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      {post.images.length > 1 && (
                        <>
                          <CarouselPrevious className="left-1 sm:left-2 bg-black/60 hover:bg-black/80 text-white border-none" />
                          <CarouselNext className="right-1 sm:right-2 bg-black/60 hover:bg-black/80 text-white border-none" />
                        </>
                      )}
                    </Carousel>
                  </div>
                  <div className="flex justify-center gap-1.5 py-3">
                    <span className="text-xs text-white/60">
                      {post.images.length} image
                      {post.images.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Documents */}
          {post.files.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              {post.files.map((media, index) => {
                const ext = media.extension?.toLowerCase();
                const { bg, text } =
                  ext === "pdf"
                    ? { bg: "bg-red-500/10", text: "text-red-500" }
                    : ext === "doc" || ext === "docx"
                      ? { bg: "bg-blue-600/10", text: "text-blue-600" }
                      : ext === "xls" || ext === "xlsx" || ext === "csv"
                        ? { bg: "bg-green-600/10", text: "text-green-600" }
                        : ext === "ppt" || ext === "pptx"
                          ? { bg: "bg-orange-500/10", text: "text-orange-500" }
                          : { bg: "bg-primary/10", text: "text-primary" };
                return (
                  <div
                    key={index}
                    className="flex flex-row items-center gap-3 px-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer justify-between"
                  >
                    <div
                      className="flex flex-row items-center gap-3 w-full py-2.5"
                      onClick={() => setPreviewDoc(media)}
                    >
                      <div
                        className={`flex items-center justify-center size-9 rounded-lg ${bg} shrink-0`}
                      >
                        <FileText className={`size-4 ${text}`} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {media.fileName || "Document"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {media.extension?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      variant={"outline"}
                      onClick={() =>
                        handleDownloadFile(media.url, media.fileName)
                      }
                    >
                      <div>
                        <ArrowDownToLine className="size-4" />
                      </div>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Document Preview Dialog */}
          <Dialog
            open={!!previewDoc}
            onOpenChange={(open) => !open && setPreviewDoc(null)}
          >
            <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
              {(() => {
                const ext = previewDoc?.extension?.toLowerCase() ?? "";
                const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
                const isPdf = ext === "pdf";
                const isText = ["txt", "csv"].includes(ext);

                const iconColor =
                  isPdf
                    ? "text-red-500"
                    : ext === "doc" || ext === "docx"
                      ? "text-blue-600"
                      : ext === "xls" || ext === "xlsx" || ext === "csv"
                        ? "text-green-600"
                        : ext === "ppt" || ext === "pptx"
                          ? "text-orange-500"
                          : "text-primary";

                const previewUrl = previewDoc
                  ? isPdf || isText
                    ? previewDoc.url
                    : isOffice
                      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewDoc.url)}`
                      : `https://docs.google.com/gview?url=${encodeURIComponent(previewDoc.url)}&embedded=true`
                  : "";

                return (
                  <>
                    <DialogHeader className="px-6 py-4 border-b shrink-0">
                      <DialogTitle className="flex items-center gap-2 text-base">
                        <FileText className={`size-4 ${iconColor}`} />
                        {previewDoc?.fileName || "Document"}
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          {ext.toUpperCase()}
                        </span>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 min-h-0">
                      {previewDoc && (
                        <iframe
                          src={previewUrl}
                          title={previewDoc.fileName || "Document Preview"}
                          className="w-full h-full border-0"
                        />
                      )}
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Supprimer le post</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Êtes-vous sûr de vouloir supprimer ce post ? Cette action est
                irréversible.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setConfirmDelete(false)}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading && (
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  )}
                  Supprimer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>

        {/* ─── Reactions Footer ─── */}
        <CardFooter className="flex flex-row items-center justify-between pt-1 pb-2">
          {/* Réactions */}
          <div
            className="flex flex-row items-center gap-1"
            aria-busy={reactionSyncing}
          >
            <button
              className={`flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                reaction === "like"
                  ? "bg-red-100 text-red-500 dark:bg-red-900/30"
                  : "hover:bg-accent text-muted-foreground"
              }`}
              onClick={() => {
                toggleReaction("like");
              }}
            >
              <Heart
                className="size-4"
                fill={reaction === "like" ? "currentColor" : "none"}
              />
              <span className="font-medium">
                {computeReactionCount(
                  "like",
                  confirmedReactionRef.current,
                  reaction,
                )}
              </span>
            </button>

            {/* <button
              className={`flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                reaction === "illuminate"
                  ? "bg-amber-100 text-amber-500 dark:bg-amber-900/30"
                  : "hover:bg-accent text-muted-foreground"
              }`}
              onClick={() => {
                toggleReaction("illuminate");
              }}
            >
              <Lightbulb
                className="size-4"
                fill={reaction === "illuminate" ? "currentColor" : "none"}
              />
              <span className="font-medium">
                {computeReactionCount(
                  "illuminate",
                  confirmedReactionRef.current,
                  reaction,
                )}
              </span>
            </button>

            <button
              className={`flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
                reaction === "support"
                  ? "bg-blue-100 text-blue-500 dark:bg-blue-900/30"
                  : "hover:bg-accent text-muted-foreground"
              }`}
              onClick={() => {
                toggleReaction("support");
              }}
            >
              <Handshake
                className="size-4"
                fill={reaction === "support" ? "currentColor" : "none"}
              />
              <span className="font-medium">
                {computeReactionCount(
                  "support",
                  confirmedReactionRef.current,
                  reaction,
                )}
              </span>
            </button> */}
          </div>

          {/* Commentaires + Partage + Enregistrer */}
          <div className="flex flex-row items-center gap-1">
            {isAuthenticated ? (
              <CollapsibleTrigger asChild>
                <button className="flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
                  <MessageCircle className="size-4" />
                  <span className="font-medium">{post.comments}</span>
                  <ChevronDown className="size-3.5" />
                </button>
              </CollapsibleTrigger>
            ) : (
              <div className="flex flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground">
                <MessageCircle className="size-4" />
                <span className="font-medium">{post.comments}</span>
              </div>
            )}

            {/* <button className="p-1.5 rounded-full text-muted-foreground hover:bg-accent transition-colors cursor-pointer">
              <Share2 className="size-4" />
            </button> */}

            {/* <button
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                saved
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => isAuthenticated && setSaved(!saved)}
            >
              <Bookmark
                className="size-4"
                fill={saved ? "currentColor" : "none"}
              />
            </button> */}
          </div>
        </CardFooter>

        {/* ─── Comments Section ─── */}
        <CollapsibleContent className="border-t">
          <div className="flex flex-col gap-3 px-4 py-3">
            {/* Écrire un commentaire */}
            {isAuthenticated && (
              <div className="flex flex-row items-center gap-2.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={currentUser?.avatarUrl || ""} alt="vous" />
                  <AvatarFallback
                    className={`text-[10px] font-semibold ${getAvatarFallbackColor(currentUser?.initials)}`}
                  >
                    {currentUser?.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-row items-center gap-1 border rounded-full px-3 py-1 w-full">
                  <Input
                    placeholder="Écrire un commentaire..."
                    className="border-0 h-7 text-sm focus:outline-none focus:ring-0 focus-visible:ring-0 p-0"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSendComment()
                    }
                    disabled={commentSending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 cursor-pointer"
                    onClick={handleSendComment}
                    disabled={commentSending || !commentText.trim()}
                  >
                    {commentSending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Chargement */}
            {commentsLoading ? (
              <div className="flex flex-col gap-3 py-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Skeleton className="size-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : commentTree.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                Aucun commentaire pour le moment.
              </p>
            ) : (
              commentTree.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default FeedItem;



