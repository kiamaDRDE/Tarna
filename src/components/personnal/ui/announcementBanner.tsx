"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Megaphone,
  Pin,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  Users,
  Clock,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Announcement } from "@/src/types/announcement";
import { useUserStore } from "@/src/store/userStore";
import { useAnnouncementStore } from "@/src/store/announcementStore";
import {
  markAnnouncementRead,
  archiveAnnouncement,
  deleteAnnouncement,
} from "@/app/(Client)/organizations/announcementActions";
import { toast } from "sonner";
import { getAvatarFallbackColor } from "@/src/lib/avatarColor";
import { getInitials } from "@/src/lib/getInitials";
import { linkifyText } from "@/src/lib/LinklyText";
import type { OrgRole } from "@/src/types/organization";

type Props = {
  announcement: Announcement;
  userRole?: OrgRole | null;
  onOpenReadStats?: (id: string) => void;
};

const AnnouncementBanner = ({
  announcement,
  userRole,
  onOpenReadStats,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const currentUser = useUserStore((s) => s.user);
  const markRead = useAnnouncementStore((s) => s.markAsRead);
  const removeAnnouncement = useAnnouncementStore((s) => s.removeAnnouncement);

  const isAdmin =
    userRole === "owner" || userRole === "admin";
  const isManager = isAdmin || userRole === "manager";
  const displayAuthor = announcement.delegate || announcement.author;
  const authorName =
    displayAuthor.displayName || displayAuthor.username || "Administrateur";
  const authorInitials = getInitials(authorName);

  // Compute timeAgo
  const now = Date.now();
  const created = new Date(announcement.createdAt).getTime();
  const diffH = Math.floor((now - created) / (1000 * 60 * 60));
  const timeAgo =
    diffH < 1
      ? "À l'instant"
      : diffH < 24
        ? `Il y a ${diffH}h`
        : `Il y a ${Math.floor(diffH / 24)}j`;

  // Mark as read when expanded
  useEffect(() => {
    if (expanded && !announcement.isRead) {
      markAnnouncementRead(announcement.id).then((res) => {
        if (res.success) markRead(announcement.id);
      });
    }
  }, [expanded, announcement.isRead, announcement.id, markRead]);

  const handleArchive = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    const res = await archiveAnnouncement(announcement.id);
    if (res.success) {
      removeAnnouncement(announcement.id);
      toast.success("Annonce archivée");
    } else {
      toast.error(res.error || "Erreur");
    }
    setActionLoading(false);
  }, [announcement.id, actionLoading, removeAnnouncement]);

  const handleDelete = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    const res = await deleteAnnouncement(announcement.id);
    if (res.success) {
      removeAnnouncement(announcement.id);
      toast.success("Annonce supprimée");
    } else {
      toast.error(res.error || "Erreur");
    }
    setActionLoading(false);
  }, [announcement.id, actionLoading, removeAnnouncement]);

  return (
    <Card className="relative overflow-hidden border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background">
      {/* Pinned badge */}
      {announcement.isPinned && (
        <div className="absolute top-2 right-2">
          <Pin className="size-3.5 text-amber-500 rotate-45" />
        </div>
      )}

      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start gap-3">
          {/* Megaphone icon */}
          <div
            className="flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <Megaphone className="size-4 text-amber-600 dark:text-amber-400" />
          </div>

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] px-1.5 py-0"
              >
                Annonce officielle
              </Badge>
              {announcement.scope === "groups" &&
                announcement.targets.length > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                  >
                    <Users className="size-2.5 mr-0.5" />
                    {announcement.targets
                      .map((t) => t.group.name)
                      .join(", ")}
                  </Badge>
                )}
              {!announcement.isRead && (
                <div className="size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold mt-1 leading-tight">
              {announcement.title}
            </h3>

            {/* Author + time */}
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="size-5">
                <AvatarImage
                  src={displayAuthor.avatarUrl || ""}
                  alt={authorName}
                />
                <AvatarFallback
                  className={`text-[8px] ${getAvatarFallbackColor(authorName)}`}
                >
                  {authorInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {authorName}
              </span>
              {announcement.delegate && (
                <span className="text-[10px] text-muted-foreground italic">
                  au nom de{" "}
                  {announcement.author.displayName ||
                    announcement.author.username}
                </span>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Expand/Collapse chevron */}
            <Button
              variant="ghost"
              size="sm"
              className="size-7 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="size-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-3.5 text-muted-foreground" />
              )}
            </Button>

            {/* Admin actions (three dots) */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0"
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    {isManager && onOpenReadStats && (
                      <DropdownMenuItem
                        onClick={() => onOpenReadStats(announcement.id)}
                      >
                        <Eye className="size-3.5 mr-2" />
                        Confirmations de lecture
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleArchive}>
                      <Archive className="size-3.5 mr-2" />
                      Archiver
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive"
                    >
                      <Trash2 className="size-3.5 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Collapsible content */}
      {expanded && (
        <CardContent className="px-4 pb-3 pt-0">
          {/* Content */}
          <div className="text-sm text-foreground/90 ml-11">
            {linkifyText(announcement.contentText)}
          </div>

          {/* Footer: read stats for admins, expiry info */}
          <div className="flex items-center gap-3 mt-2 ml-11">
            {isManager && (
              <button
                onClick={() => onOpenReadStats?.(announcement.id)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {announcement.isRead ? (
                  <Eye className="size-3" />
                ) : (
                  <EyeOff className="size-3" />
                )}
                <span>
                  {announcement._count.reads} lecture
                  {announcement._count.reads > 1 ? "s" : ""}
                </span>
              </button>
            )}
            {announcement.expiresAt && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                Expire le{" "}
                {new Date(announcement.expiresAt).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AnnouncementBanner;
