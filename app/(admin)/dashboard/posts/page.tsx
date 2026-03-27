"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/src/components/providers/socketProvider";
import { useUserStore } from "@/src/store/userStore";
import { useAdminPostStore, AdminPost } from "@/src/store/adminPostStore";
import { apiFetch } from "@/src/lib/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/components/ui/avatar";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Separator } from "@/src/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Search,
  FileText,
  Trash2,
  Eye,
  MessageSquare,
  Image as ImageIcon,
  MoreHorizontal,
  Clock,
  RefreshCw,
  Copy,
  Pin,
  PenLine,
  Globe,
  Lock,
  Heart,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const VISIBILITY_CONFIG: Record<string, { icon: typeof Globe; label: string; className: string }> = {
  public: { icon: Globe, label: "Public", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  private: { icon: Lock, label: "Privé", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  organization: { icon: Lock, label: "Organisation", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
};

// ── Skeleton Rows ────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell>
            <div className="flex gap-3">
              <Skeleton className="h-3.5 w-8" />
              <Skeleton className="h-3.5 w-8" />
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-3.5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function PostModerationPage() {
  const accessToken = useUserStore((s) => s.accessToken);
  const socket = useSocket();
  const { posts, loading, nextCursor, hasMore, setPosts, appendPosts, removePost, setLoading } =
    useAdminPostStore();
  const [search, setSearch] = useState("");
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const initialFetchDone = useRef(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPosts = useCallback(
    async (cursor?: string | null, searchQuery?: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "30");
      if (cursor) params.set("cursor", cursor);
      if (searchQuery) params.set("search", searchQuery);

      const res = await apiFetch(
        `/posts/admin?${params.toString()}`,
        accessToken,
      );
      if (res.ok) {
        const json = await res.json();
        if (cursor) {
          appendPosts(json.data, json.meta?.nextCursor, json.meta?.hasMore);
        } else {
          setPosts(json.data, json.meta?.nextCursor, json.meta?.hasMore);
        }
      }
      setLoading(false);
    },
    [accessToken, setPosts, appendPosts, setLoading],
  );

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!socket) return;
    const handleDeleted = (data: { postId: string }) => {
      removePost(data.postId);
    };
    socket.on("post:deleted", handleDeleted);
    return () => {
      socket.off("post:deleted", handleDeleted);
    };
  }, [socket, removePost]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void fetchPosts(null, value.trim() || undefined);
      }, 400);
    },
    [fetchPosts],
  );

  const handleDelete = useCallback(
    async (postId: string) => {
      setDeleting(postId);
      const res = await apiFetch(`/posts/${postId}`, accessToken, {
        method: "DELETE",
      });
      if (res.ok) {
        removePost(postId);
        setSelectedPost(null);
        setConfirmDelete(null);
        toast.success("Post supprimé avec succès");
      } else {
        toast.error("Erreur lors de la suppression");
      }
      setDeleting(null);
    },
    [accessToken, removePost],
  );

  // Stats
  const stats = {
    total: posts.length,
    withImages: posts.filter((p) => p.images.length > 0).length,
    withComments: posts.filter((p) => p._count.comments > 0).length,
  };

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Modération des Posts</h1>
            <p className="text-sm text-muted-foreground">
              Gérer et modérer les publications de la plateforme
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8 cursor-pointer mt-2 sm:mt-0"
                onClick={() => void fetchPosts(null, search.trim() || undefined)}
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rafraîchir</TooltipContent>
          </Tooltip>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total posts", value: stats.total, icon: FileText, color: "text-blue-600 dark:text-blue-400" },
            { label: "Avec images", value: stats.withImages, icon: ImageIcon, color: "text-violet-600 dark:text-violet-400" },
            { label: "Avec commentaires", value: stats.withComments, icon: MessageSquare, color: "text-emerald-600 dark:text-emerald-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className={`rounded-lg bg-muted p-2.5 ${s.color}`}>
                <s.icon className="size-4" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9 h-10"
            placeholder="Rechercher par contenu, auteur..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-50">Auteur</TableHead>
                <TableHead className="min-w-64">Contenu</TableHead>
                <TableHead className="min-w-25">Visibilité</TableHead>
                <TableHead className="min-w-30">Engagement</TableHead>
                <TableHead className="min-w-25">Date</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && posts.length === 0 ? (
                <TableSkeleton />
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileText className="size-10 opacity-20" />
                      <p className="text-sm">Aucun post trouvé</p>
                      <p className="text-xs">
                        {search ? "Essayez d'autres termes de recherche" : "Les posts apparaîtront ici"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => {
                  const vis = VISIBILITY_CONFIG[post.visibility] ?? VISIBILITY_CONFIG.public;
                  const VisIcon = vis.icon;
                  return (
                    <TableRow
                      key={post.id}
                      className="group cursor-pointer"
                      onClick={() => setSelectedPost(post)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border">
                            <AvatarImage src={post.author.avatarUrl ?? ""} />
                            <AvatarFallback className="text-[10px] font-medium">
                              {getInitials(post.author.displayName ?? post.author.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate leading-tight">
                                {post.author.displayName ?? post.author.username}
                              </p>
                              {post.isPinned && (
                                <Pin className="size-3 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              @{post.author.username}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm text-foreground/80 line-clamp-1 leading-snug">
                            {post.contentText ?? "(pas de texte)"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {post.images.length > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <ImageIcon className="size-3" />
                                {post.images.length}
                              </span>
                            )}
                            {post.organization && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 font-normal"
                              >
                                {post.organization.name}
                              </Badge>
                            )}
                            {post.isEdited && (
                              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                <PenLine className="size-2.5" />
                                modifié
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`gap-1 font-normal text-xs ${vis.className} border-0`}
                        >
                          <VisIcon className="size-3" />
                          {vis.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 cursor-default">
                                <MessageSquare className="size-3" />
                                {post._count.comments}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Commentaires</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground flex items-center gap-1.5 cursor-default">
                              <Clock className="size-3 opacity-50" />
                              {timeAgo(post.createdAt)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {formatDate(post.createdAt)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPost(post);
                              }}
                            >
                              <Eye className="size-4" />
                              Voir le détail
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(post.id);
                                toast.success("ID copié");
                              }}
                            >
                              <Copy className="size-4" />
                              Copier l&apos;ID
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(post.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="border-t p-3">
              <Button
                variant="ghost"
                className="w-full text-sm cursor-pointer"
                disabled={loading}
                onClick={() => void fetchPosts(nextCursor, search.trim() || undefined)}
              >
                {loading ? (
                  <RefreshCw className="size-4 animate-spin mr-2" />
                ) : null}
                Charger plus de posts
              </Button>
            </div>
          )}
        </div>

        {/* ── Detail Dialog ──────────────────────────────── */}
        <Dialog
          open={!!selectedPost}
          onOpenChange={(open) => {
            if (!open) setSelectedPost(null);
          }}
        >
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-muted p-2">
                  <FileText className="size-4" />
                </div>
                Détail du post
              </DialogTitle>
            </DialogHeader>
            {selectedPost && (() => {
              const vis = VISIBILITY_CONFIG[selectedPost.visibility] ?? VISIBILITY_CONFIG.public;
              const VisIcon = vis.icon;
              return (
                <div className="px-6 pb-6 pt-4 space-y-5">
                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border">
                      <AvatarImage src={selectedPost.author.avatarUrl ?? ""} />
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(
                          selectedPost.author.displayName ?? selectedPost.author.username,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium leading-tight">
                          {selectedPost.author.displayName ?? selectedPost.author.username}
                        </p>
                        {selectedPost.isPinned && <Pin className="size-3 text-amber-500" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{selectedPost.author.username} · {formatDate(selectedPost.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`gap-1 font-normal ${vis.className} border-0`}
                    >
                      <VisIcon className="size-3" />
                      {vis.label}
                    </Badge>
                  </div>

                  <Separator />

                  {/* Content */}
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedPost.contentText ?? "(pas de texte)"}
                  </div>

                  {/* Images */}
                  {selectedPost.images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {selectedPost.images.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Image ${i + 1}`}
                          className="h-36 rounded-xl object-cover border shadow-sm shrink-0"
                        />
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  {Object.keys(selectedPost.stats).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(selectedPost.stats).map(([key, val]) => (
                        <div
                          key={key}
                          className="flex flex-col items-center gap-0.5 p-3 bg-muted/50 rounded-xl border"
                        >
                          <p className="text-xl font-semibold tabular-nums">{val as number}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">
                            {key.replace(/_/g, " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPost.organization && (
                      <Badge variant="secondary" className="font-normal">
                        {selectedPost.organization.name}
                      </Badge>
                    )}
                    {selectedPost.isEdited && (
                      <Badge variant="outline" className="font-normal gap-1">
                        <PenLine className="size-3" /> Modifié
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Delete */}
                  <Button
                    variant="destructive"
                    className="w-full cursor-pointer gap-2"
                    disabled={deleting === selectedPost.id}
                    onClick={() => void handleDelete(selectedPost.id)}
                  >
                    {deleting === selectedPost.id ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Supprimer ce post
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ── Confirm Delete Dialog ──────────────────────── */}
        <Dialog
          open={!!confirmDelete}
          onOpenChange={(open) => {
            if (!open) setConfirmDelete(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Cette action est irréversible. Le post et tous ses commentaires seront définitivement supprimés.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setConfirmDelete(null)}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer gap-2"
                disabled={deleting === confirmDelete}
                onClick={() => {
                  if (confirmDelete) void handleDelete(confirmDelete);
                }}
              >
                {deleting === confirmDelete ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
